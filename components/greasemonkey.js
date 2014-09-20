///////////////////////// Component-global "Constants" /////////////////////////

var DESCRIPTION = "GM_GreasemonkeyService";
var CONTRACTID = "@greasemonkey.mozdev.org/greasemonkey-service;1";
var CLASSID = Components.ID("{77bf3650-1cd6-11da-8cd6-0800200c9a66}");

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

Cu.import("resource://greasemonkey/third-party/getChromeWinForContentWin.js");
Cu.import('resource://greasemonkey/GM_setClipboard.js');
Cu.import('resource://greasemonkey/constants.js');
Cu.import("resource://greasemonkey/menucommand.js");
Cu.import("resource://greasemonkey/miscapis.js");
Cu.import("resource://greasemonkey/parseScript.js");
Cu.import("resource://greasemonkey/prefmanager.js");
Cu.import("resource://greasemonkey/sync.js");
Cu.import("resource://greasemonkey/util.js");
Cu.import("resource://greasemonkey/xmlhttprequester.js");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

// Only a particular set of strings are allowed.  See: http://goo.gl/ex2LJ
var gMaxJSVersion = "ECMAv5";

var gStartupHasRun = false;
var gScriptEndingRegexp = new RegExp('\\.user\\.js$');

var gFileProtocolHandler = Components
    .classes["@mozilla.org/network/protocol;1?name=file"]
    .getService(Ci.nsIFileProtocolHandler);
var gIoService = Cc["@mozilla.org/network/io-service;1"]
    .getService(Ci.nsIIOService);
var gStringBundle = Components
    .classes["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .createBundle("chrome://greasemonkey/locale/greasemonkey.properties");
var gTmpDir = Components.classes["@mozilla.org/file/directory_service;1"]
    .getService(Components.interfaces.nsIProperties)
    .get("TmpD", Components.interfaces.nsIFile);

var gStripUserPassRegexp = new RegExp('(://)([^:/]+)(:[^@/]+)?@');

/////////////////////// Component-global Helper Functions //////////////////////

// TODO: Remove this, see #1318.
function alert(msg) {
  Cc["@mozilla.org/embedcomp/prompt-service;1"]
    .getService(Ci.nsIPromptService)
    .alert(null, "Greasemonkey alert", msg);
}

function contentLoad(aEvent) {
  var safeWin = aEvent.target.defaultView;
  safeWin.removeEventListener('DOMContentLoaded', contentLoad, true);
  safeWin.removeEventListener('load', contentLoad, true);
  GM_util.getService().runScripts('document-end', safeWin);
}

function createSandbox(aScript, aContentWin, aUrl) {
  if (GM_util.inArray(aScript.grants, 'none')) {
    // If there is an explicit none grant, use a plain unwrapped sandbox
    // with no other content.
    var contentSandbox = new Components.utils.Sandbox(
        aContentWin,
        {
          'sandboxName': aScript.id,
          'sandboxPrototype': aContentWin,
          'wantXrays': false,
        });
    // GM_info is always provided.
    Components.utils.evalInSandbox(
        'const GM_info = ' + uneval(aScript.info()), contentSandbox);
    // Alias unsafeWindow for compatibility.
    Components.utils.evalInSandbox(
        'const unsafeWindow = window;', contentSandbox);

    if (GM_util.compareFirefoxVersion("16.0") < 0) {
      // See #1350.  The upstream bug was fixed in Firefox 16; apply workaround
      // only in older versions.
      contentSandbox.alert = alert;
    }

    return contentSandbox;
  }

  var sandbox = new Components.utils.Sandbox(
      [aContentWin],
      {
        'sandboxName': aScript.id,
        'sandboxPrototype': aContentWin,
        'wantXrays': true,
      });

  // Note that because waivers aren't propagated between origins, we need the
  // unsafeWindow getter to live in the sandbox.  See http://bugzil.la/1043958
  var unsafeWindowGetter = new sandbox.Function(
      'return window.wrappedJSObject || window;');
  Object.defineProperty(sandbox, 'unsafeWindow', {get: unsafeWindowGetter});

  // Functions for interaction with unsafeWindow; see: http://goo.gl/C8Au16
  sandbox.createObjectIn = Cu.createObjectIn;
  sandbox.cloneInto = Cu.cloneInto;
  sandbox.exportFunction = Cu.exportFunction;

  if (GM_util.inArray(aScript.grants, 'GM_addStyle')) {
    sandbox.GM_addStyle = GM_util.hitch(null, GM_addStyle, aContentWin.document);
  }
  if (GM_util.inArray(aScript.grants, 'GM_log')) {
    sandbox.GM_log = GM_util.hitch(new GM_ScriptLogger(aScript), 'log');
  }
  if (GM_util.inArray(aScript.grants, 'GM_registerMenuCommand')) {
    var gmrmc = GM_util.hitch(
        null, registerMenuCommand, aContentWin, aScript);
    sandbox.GM_registerMenuCommand = gmrmc;
  }

  var scriptStorage = new GM_ScriptStorage(aScript);
  if (GM_util.inArray(aScript.grants, 'GM_deleteValue')) {
    sandbox.GM_deleteValue = GM_util.hitch(scriptStorage, 'deleteValue');
  }
  if (GM_util.inArray(aScript.grants, 'GM_getValue')) {
    sandbox.GM_getValue = GM_util.hitch(scriptStorage, 'getValue');
  }
  if (GM_util.inArray(aScript.grants, 'GM_setValue')) {
    sandbox.GM_setValue = GM_util.hitch(scriptStorage, 'setValue');
  }

  if (GM_util.inArray(aScript.grants, 'GM_setClipboard')) {
    sandbox.GM_setClipboard = GM_util.hitch(null, GM_setClipboard);
  }

  var scriptResources = new GM_Resources(aScript);
  if (GM_util.inArray(aScript.grants, 'GM_getResourceURL')) {
    sandbox.GM_getResourceURL = GM_util.hitch(scriptResources, 'getResourceURL', aScript);
  }
  if (GM_util.inArray(aScript.grants, 'GM_getResourceText')) {
    sandbox.GM_getResourceText = GM_util.hitch(scriptResources, 'getResourceText');
  }

  if (GM_util.inArray(aScript.grants, 'GM_listValues')) {
    sandbox.GM_listValues = GM_util.hitch(scriptStorage, 'listValues');
  }
  if (GM_util.inArray(aScript.grants, 'GM_openInTab')) {
    sandbox.GM_openInTab = GM_util.hitch(
        null, GM_openInTab, aContentWin);
  }
  if (GM_util.inArray(aScript.grants, 'GM_xmlhttpRequest')) {
    sandbox.GM_xmlhttpRequest = GM_util.hitch(
        new GM_xmlhttpRequester(aContentWin, aUrl, sandbox),
        'contentStartRequest');
  }

  Components.utils.evalInSandbox(
      'const GM_info = ' + uneval(aScript.info()), sandbox);

  return sandbox;
}

function isTempScript(uri) {
  if (uri.scheme != "file") return false;
  var file = gFileProtocolHandler.getFileFromURLSpec(uri.spec);
  return gTmpDir.contains(file, true);
}

function runScriptInSandbox(script, sandbox) {
  // Eval the code, with anonymous wrappers when/if appropriate.
  function evalWithWrapper(code, fileName) {
    try {
      Components.utils.evalInSandbox(code, sandbox, gMaxJSVersion, fileName, 1);
    } catch (e) {
      if ("return not in function" == e.message) {
        // See #1592; we never anon wrap anymore, unless forced to by a return
        // not in a function.
        GM_util.logError(
            gStringBundle.GetStringFromName('return-not-in-func-deprecated'),
            true, // is a warning
            fileName,
            e.lineNumber
            );
        Components.utils.evalInSandbox(
            GM_util.anonWrap(code), sandbox, gMaxJSVersion, fileName, 1);
      } else {
        // Otherwise raise.
        throw e;
      }
    }
  }

  // Eval the code, with a try/catch to report errors cleanly.
  function evalWithCatch(code, fileName) {
    try {
      evalWithWrapper(code, fileName);
    } catch (e) {
      // Log it properly.
      GM_util.logError(e, false, fileName, e.lineNumber);
      // Stop the script, in the case of requires, as if it was one big script.
      return false;
    }
    return true;
  }

  for (var i = 0, require = null; require = script.requires[i]; i++) {
    if (!evalWithCatch(require.textContent, require.fileURL)) {
      return;
    }
  }
  evalWithCatch(script.textContent, script.fileURL);
}

function startup(aService) {
  if (gStartupHasRun) return;
  gStartupHasRun = true;

  var loader = Cc["@mozilla.org/moz/jssubscript-loader;1"]
      .getService(Ci.mozIJSSubScriptLoader);
  loader.loadSubScript("chrome://global/content/XPCNativeWrapper.js");
  loader.loadSubScript("chrome://greasemonkey/content/config.js");
  loader.loadSubScript("chrome://greasemonkey/content/third-party/mpl-utils.js");

  var observerService = Components.classes['@mozilla.org/observer-service;1']
     .getService(Components.interfaces.nsIObserverService);
  observerService.addObserver(aService, 'document-element-inserted', false);

  // Import this once, early, so that enqueued deletes can happen.
  Cu.import("resource://greasemonkey/util/enqueueRemoveFile.js");
}

/////////////////////////////////// Service ////////////////////////////////////

function service() {
  this.contentLoad = contentLoad;
  this.filename = Components.stack.filename;
  this.wrappedJSObject = this;
}

////////////////////////////////// Constants ///////////////////////////////////

service.prototype.classDescription = DESCRIPTION;
service.prototype.classID = CLASSID;
service.prototype.contractID = CONTRACTID;
service.prototype._xpcom_categories = [{
      category: "app-startup",
      entry: DESCRIPTION,
      value: CONTRACTID,
      service: true
    },{
      category: "content-policy",
      entry: CONTRACTID,
      value: CONTRACTID,
      service: true
    }];
service.prototype.QueryInterface = XPCOMUtils.generateQI([
      Ci.nsIObserver,
      Ci.nsISupports,
      Ci.nsISupportsWeakReference,
      Ci.nsIWindowMediatorListener,
      Ci.nsIContentPolicy
    ]);

/////////////////////////////// nsIContentPolicy ///////////////////////////////

service.prototype.shouldLoad = function(ct, cl, org, ctx, mt, ext) {
  var ret = Ci.nsIContentPolicy.ACCEPT;

  // Don't intercept anything when GM is not enabled.
  if (!GM_util.getEnabled()) {
    return ret;
  }

  // Don't interrupt the "view-source:" scheme (which is triggered if the link
  // in the error console is clicked), nor the "greasemonkey-script:" scheme.
  if ("view-source" == cl.scheme || "greasemonkey-script" == cl.scheme) {
    return ret;
  }

  // Do not install scripts when the origin URL "is a script".  See #1875
  if (org && org.spec.match(gScriptEndingRegexp)) {
    return ret;
  }

  if ((ct == Ci.nsIContentPolicy.TYPE_DOCUMENT
       || ct == Ci.nsIContentPolicy.TYPE_SUBDOCUMENT)
      && cl.spec.match(gScriptEndingRegexp)
  ) {
    if (!this._ignoreNextScript && !isTempScript(cl)) {
      GM_util.showInstallDialog(cl.spec, ctx, this);
      ret = Ci.nsIContentPolicy.REJECT_REQUEST;
    }

    this._ignoreNextScript = false;
  }

  return ret;
};

service.prototype.shouldProcess = function(ct, cl, org, ctx, mt, ext) {
  return Ci.nsIContentPolicy.ACCEPT;
};

///////////////////////////////// nsIObserver //////////////////////////////////

service.prototype.observe = function(aSubject, aTopic, aData) {
  switch (aTopic) {
    case 'app-startup':
    case 'profile-after-change':
      startup(this);
      break;
    case 'document-element-inserted':
      if (!GM_util.getEnabled()) break;
      var doc = aSubject;
      var win = doc && doc.defaultView;
      if (!doc || !win) break;

      win.addEventListener('DOMContentLoaded', contentLoad, true);
      win.addEventListener('load', contentLoad, true);
      this.runScripts('document-start', win);

      break;
  }
};

///////////////////////////// Greasemonkey Service /////////////////////////////

service.prototype._config = null;
service.prototype.__defineGetter__('config', function() {
  if (!this._config) {
    // First guarantee instantiation and existence.  (So that anything,
    // including stuff inside i.e. config._load(), can call
    // i.e. config._changed().)
    this._config = new Config();
    // Then initialize.
    this._config.initialize();
  }
  return this._config;
});

service.prototype.contentDestroyed = function(aContentWindowId) {
  removeMatchingMenuCommands(null, function(index, command) {
    // Remove the reference if either the window is closed, ...
    return (GM_util.windowIsClosed(command.contentWindow)
        // ... or the content destroyed message matches the command's window id.
        || (aContentWindowId && (command.contentWindowId == aContentWindowId)));
  }, true);  // Don't forget the aForced=true passed here!
};

service.prototype.contentFrozen = function(contentWindowId) {
  if (!contentWindowId) return;
  withAllMenuCommandsForWindowId(contentWindowId,
      function(index, command) { command.frozen = true; });
};

service.prototype.contentThawed = function(contentWindowId) {
  if (!contentWindowId) return;
  withAllMenuCommandsForWindowId(contentWindowId,
      function(index, command) { command.frozen = false; });
};

service.prototype.runScripts = function(aRunWhen, aWrappedContentWin) {
  // See #1970
  // When content does (e.g.) history.replacestate() in an inline script,
  // the location.href changes between document-start and document-end time.
  // But the content can call replacestate() much later, too.  The only way to
  // be consistent is to ignore it.  Luckily, the  document.documentURI does
  // _not_ change, so always use it when deciding whether to run scripts.
  var url = aWrappedContentWin.document.documentURI;
  // But ( #1631 ) ignore user/pass in the URL.
  url = url.replace(gStripUserPassRegexp, '$1');

  if (!GM_util.getEnabled() || !GM_util.isGreasemonkeyable(url)) return;

  if (GM_prefRoot.getValue('enableScriptRefreshing')) {
    this._config.updateModifiedScripts(aRunWhen, aWrappedContentWin);
  }

  var scripts = this.config.getMatchingScripts(function(script) {
    try {
      return GM_util.scriptMatchesUrlAndRuns(script, url, aRunWhen);
    } catch (e) {
      GM_util.logError(e, false, e.fileName, e.lineNumber);
      // See #1692; Prevent failures like that from being so severe.
      return false;
    }
  });
  if (scripts.length > 0) {
    this.injectScripts(scripts, url, aWrappedContentWin);
  }
};

service.prototype.ignoreNextScript = function() {
  this._ignoreNextScript = true;
};

service.prototype.injectScripts = function(
    scripts, url, wrappedContentWin
) {
  try {
    wrappedContentWin.QueryInterface(Ci.nsIDOMChromeWindow);
    // Never ever inject scripts into a chrome context window.
    return;
  } catch (e) {
    // Ignore, it's good if we can't QI to a chrome window.
  }

  var chromeWin = getChromeWinForContentWin(wrappedContentWin);

  for (var i = 0, script = null; script = scripts[i]; i++) {
    var sandbox = createSandbox(script, wrappedContentWin, url);
    runScriptInSandbox(script, sandbox);
  }
};

//////////////////////////// Component Registration ////////////////////////////

var NSGetFactory = XPCOMUtils.generateNSGetFactory([service]);
