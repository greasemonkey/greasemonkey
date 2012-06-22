///////////////////////// Component-global "Constants" /////////////////////////

var DESCRIPTION = "GM_GreasemonkeyService";
var CONTRACTID = "@greasemonkey.mozdev.org/greasemonkey-service;1";
var CLASSID = Components.ID("{77bf3650-1cd6-11da-8cd6-0800200c9a66}");

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

var gmRunScriptFilename = "resource://greasemonkey/runScript.js";
var gExtensionPath = (function() {
  var ioService = Components.classes["@mozilla.org/network/io-service;1"]
      .getService(Components.interfaces.nsIIOService);
  if ('jar:' == Components.stack.filename.substr(0, 4)) {
    // Unpacked XPI case.
    return Components.stack.filename.replace(/\!\/.*/, '');
  } else if ('file:' == Components.stack.filename.substr(0, 5)){
    // Raw file, development case.
    // Turn the file:/// URL into an nsIFile ...
    var uri = ioService.newURI(Components.stack.filename, null, null);
    var file = uri.QueryInterface(Components.interfaces.nsIFileURL).file;
    // ... to find the containing directory.
    var dir = file.parent.parent;
    // Then get the URL back for that path.
    return ioService.newFileURI(dir).spec;
  } else {
    throw Error('Could not detect gExtensionPath!');
  }
})();

// Only a particular set of strings are allowed.  See: http://goo.gl/ex2LJ
var gMaxJSVersion = "ECMAv5";

var gMenuCommands = [];
var gStartupHasRun = false;

var gFileProtocolHandler = Components
    .classes["@mozilla.org/network/protocol;1?name=file"]
    .getService(Ci.nsIFileProtocolHandler);
var gTmpDir = Components.classes["@mozilla.org/file/directory_service;1"]
    .getService(Components.interfaces.nsIProperties)
    .get("TmpD", Components.interfaces.nsILocalFile);

/////////////////////// Component-global Helper Functions //////////////////////

// TODO: Remove this, see #1318.
function alert(msg) {
  Cc["@mozilla.org/embedcomp/prompt-service;1"]
    .getService(Ci.nsIPromptService)
    .alert(null, "Greasemonkey alert", msg);
}

function anonWrap(aSource) {
  return ['(function(){', aSource, '})()'].join('');
}

// Examines the stack to determine if an API should be callable.
function GM_apiLeakCheck(apiName) {
  var stack = Components.stack;

  do {
    // Valid locations for GM API calls are:
    //  * Greasemonkey modules.
    //  * All of chrome.  (In the script update case, chrome will list values.)
    //  * Greasemonkey extension by path. (FF 3 does this instead of the above.)
    // Anything else on the stack and we will reject the API, to make sure that
    // the content window (whose path would be e.g. http://...) has no access.
    if (2 == stack.language
        && stack.filename.substr(0, 24) !== 'resource://greasemonkey/'
        && stack.filename.substr(0, 9) !== 'chrome://'
        && stack.filename.substr(0, gExtensionPath.length) !== gExtensionPath
        ) {
      GM_util.logError(new Error("Greasemonkey access violation: " +
          "unsafeWindow cannot call " + apiName + "."));
      return false;
    }

    stack = stack.caller;
  } while (stack);

  return true;
}

function createSandbox(
    aScript, aContentWin, aChromeWin, aFirebugConsole, aUrl
) {
  var sandbox = new Components.utils.Sandbox(
      aContentWin,
      {
        'sandboxName': aScript.id,
        'sandboxPrototype': aContentWin,
        'wantXrays': true,
      });
  sandbox.unsafeWindow = aContentWin.wrappedJSObject;
  sandbox.console = aFirebugConsole ? aFirebugConsole : new GM_console(aScript);

  // Temporary workaround for #1318.  TODO: Remove when upstream bug fixed.
  sandbox.alert = alert;

  var imp = sandbox.importFunction;
  if (GM_util.inArray(aScript.grants, 'GM_addStyle')) {
    imp(function(css) { GM_addStyle(aContentWin.document, css); },
        'GM_addStyle');
  }
  if (GM_util.inArray(aScript.grants, 'GM_log')) {
    imp(GM_util.hitch(new GM_ScriptLogger(aScript), 'log'), 'GM_log');
  }
  if (GM_util.inArray(aScript.grants, 'GM_registerMenuCommand')) {
    var gmrmc = GM_util.hitch(
        null, registerMenuCommand, aContentWin, aChromeWin, aScript);
    imp(gmrmc, 'GM_registerMenuCommand');
  }

  var scriptStorage = new GM_ScriptStorage(aScript);
  if (GM_util.inArray(aScript.grants, 'GM_deleteValue')) {
    imp(GM_util.hitch(scriptStorage, 'deleteValue'), 'GM_deleteValue');
  }
  if (GM_util.inArray(aScript.grants, 'GM_getValue')) {
    imp(GM_util.hitch(scriptStorage, 'getValue'), 'GM_getValue');
  }
  if (GM_util.inArray(aScript.grants, 'GM_setValue')) {
    imp(GM_util.hitch(scriptStorage, 'setValue'), 'GM_setValue');
  }

  var scriptResources = new GM_Resources(aScript);
  if (GM_util.inArray(aScript.grants, 'GM_getResourceURL')) {
    imp(GM_util.hitch(scriptResources, 'getResourceURL', aScript),
        'GM_getResourceURL');
  }
  if (GM_util.inArray(aScript.grants, 'GM_getResourceText')) {
    imp(GM_util.hitch(
        scriptResources, 'getResourceText'), 'GM_getResourceText');
  }

  // The .importMethod() is safe because it can't return object values (I
  // think?) -- but sometimes we want to, so in that case do a straight assign.
  // TODO: When minVer=4 check if this is still necessary.
  if (GM_util.inArray(aScript.grants, 'GM_listValues')) {
    sandbox.GM_listValues = GM_util.hitch(scriptStorage, 'listValues');
  }
  if (GM_util.inArray(aScript.grants, 'GM_openInTab')) {
    sandbox.GM_openInTab = GM_util.hitch(
        null, openInTab, aContentWin, aChromeWin);
  }
  if (GM_util.inArray(aScript.grants, 'GM_xmlhttpRequest')) {
    sandbox.GM_xmlhttpRequest = GM_util.hitch(
        new GM_xmlhttpRequester(aContentWin, aChromeWin, aUrl),
        'contentStartRequest');
  }

  return sandbox;
}

function findError(script, lineNumber) {
  var start = 0;
  var end = 1;

  for (var i = 0; i < script.offsets.length; i++) {
    end = script.offsets[i];
    if (lineNumber <= end) {
      return {
        uri: script.requires[i].fileURL,
        lineNumber: (lineNumber - start)
      };
    }
    start = end;
  }

  return {
    uri: script.fileURL,
    lineNumber: (lineNumber - end)
  };
}

function getFirebugConsole(wrappedContentWin, chromeWin) {
  try {
    return chromeWin.Firebug
        && chromeWin.Firebug.getConsoleByGlobal
        && chromeWin.Firebug.getConsoleByGlobal(wrappedContentWin)
        || null;
  } catch (e) {
    dump('Greasemonkey: Failure Firebug console:\n' + uneval(e) + '\n');
    return null;
  }
}

function isTempScript(uri) {
  if (uri.scheme != "file") return false;
  var file = gFileProtocolHandler.getFileFromURLSpec(uri.spec);
  return gTmpDir.contains(file, true);
}

function openInTab(safeContentWin, chromeWin, url, aLoadInBackground) {
  if (!GM_apiLeakCheck("GM_openInTab")) {
    return undefined;
  }
  if ('undefined' == typeof aLoadInBackground) aLoadInBackground = null;

  var browser = chromeWin.gBrowser;
  var currentTab = browser.tabs[
      browser.getBrowserIndexForDocument(safeContentWin.document)];
  var newTab = browser.loadOneTab(url, {'inBackground': aLoadInBackground});
  var newWin = GM_windowForTab(newTab, browser);

  var afterCurrent = Cc["@mozilla.org/preferences-service;1"]
      .getService(Ci.nsIPrefService)
      .getBranch("browser.tabs.")
      .getBoolPref("insertRelatedAfterCurrent");
  if (afterCurrent) {
    browser.moveTabTo(newTab, currentTab._tPos + 1);
  }

  return newWin;
};

function registerMenuCommand(
    wrappedContentWin, chromeWin, script,
    commandName, commandFunc, accessKey, unused, accessKey2
) {
  if (!GM_apiLeakCheck("GM_registerMenuCommand")) {
    return;
  }

  if (wrappedContentWin.top != wrappedContentWin) {
    // Only register menu commands for the top level window.
    return;
  }

  // Legacy support: if all five parameters were specified, (from when two
  // were for accelerators) use the last one as the access key.
  if ('undefined' != typeof accessKey2) {
    accessKey = accessKey2;
  }

  if (accessKey
      && (("string" != typeof accessKey) || (accessKey.length != 1))
  ) {
    throw new Error('Error with menu command "'
        + commandName + '": accessKey must be a single character');
  }

  var command = {
      name: commandName,
      accessKey: accessKey,
      commandFunc: commandFunc,
      contentWindow: wrappedContentWin,
      contentWindowId: GM_util.windowId(wrappedContentWin),
      frozen: false};
  gMenuCommands.push(command);
};

function runScriptInSandbox(code, sandbox, script) {
  try {
    GM_runScript(code, sandbox, gMaxJSVersion);
  } catch (e) { // catches errors while running the script code
    try {
      if (e && "return not in function" == e.message) {
        // Means this script depends on the function enclosure.
        return false;
      }

      // Most errors seem to have a ".fileName", but rarely they're in
      // ".filename" instead.
      var fileName = e.fileName || e.filename;

      // TODO: Climb the stack to find the script-source line?
      if (fileName == gmRunScriptFilename) {
        // Now that we know where the error is, find it (inside @requires if
        // necessary) in the script and log it.
        var err = findError(script, e.lineNumber);
        GM_util.logError(
             e, // error obj
             0, // 0 = error (1 = warning)
             err.uri, err.lineNumber);
      } else {
        GM_util.logError(e);
      }
    } catch (e) {
      // Do not raise (this would stop all scripts), log.
      GM_util.logError(e);
    }
  }
  return true; // did not need a (function() {...})() enclosure.
}

function startup(aService) {
  if (gStartupHasRun) return;
  gStartupHasRun = true;

  Cu.import(gmRunScriptFilename);
  Cu.import("resource://greasemonkey/third-party/getChromeWinForContentWin.js");
  Cu.import("resource://greasemonkey/prefmanager.js");
  Cu.import("resource://greasemonkey/util.js");  // At top = fail in FF3.

  var loader = Cc["@mozilla.org/moz/jssubscript-loader;1"]
      .getService(Ci.mozIJSSubScriptLoader);
  loader.loadSubScript("chrome://global/content/XPCNativeWrapper.js");
  loader.loadSubScript("chrome://greasemonkey/content/config.js");
  loader.loadSubScript("chrome://greasemonkey/content/miscapis.js");
  loader.loadSubScript("chrome://greasemonkey/content/xmlhttprequester.js");
  loader.loadSubScript("chrome://greasemonkey/content/third-party/mpl-utils.js");

  var observerService = Components.classes['@mozilla.org/observer-service;1']
     .getService(Components.interfaces.nsIObserverService);
  observerService.addObserver(aService, 'document-element-inserted', false);
}

/////////////////////////////////// Service ////////////////////////////////////

function service() {
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
      Ci.gmIGreasemonkeyService,
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

  if ((ct == Ci.nsIContentPolicy.TYPE_DOCUMENT
       || ct == Ci.nsIContentPolicy.TYPE_SUBDOCUMENT)
      && cl.spec.match(/\.user\.js$/)
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
      var doc = aSubject;
      if (null === doc.location) break;
      if (!GM_util.isGreasemonkeyable(doc.location.href)) break;
      var win = doc.defaultView;
      this.runScripts('document-start', win);
      break;
  }
};

//////////////////////////// gmIGreasemonkeyService ////////////////////////////

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

service.prototype.contentDestroyed = function(contentWindowId) {
  this.withAllMenuCommandsForWindowId(null, function(index, command) {
    var closed = false;
    try { closed = command.contentWindow.closed; } catch (e) { }

    if (closed ||
        (contentWindowId && (command.contentWindowId == contentWindowId))
    ) {
      gMenuCommands.splice(index, 1);
    }
  }, true);
};

service.prototype.contentFrozen = function(contentWindowId) {
  if (!contentWindowId) return;
  this.withAllMenuCommandsForWindowId(contentWindowId,
      function(index, command) { command.frozen = true; });
};

service.prototype.contentThawed = function(contentWindowId) {
  if (!contentWindowId) return;
  this.withAllMenuCommandsForWindowId(contentWindowId,
      function(index, command) { command.frozen = false; });
};

service.prototype.runScripts = function(aRunWhen, aWrappedContentWin) {
  var url = aWrappedContentWin.document.location.href;
  if (!GM_util.getEnabled() || !GM_util.isGreasemonkeyable(url)) return;

  if (GM_prefRoot.getValue('enableScriptRefreshing')) {
    this._config.updateModifiedScripts(aRunWhen, aWrappedContentWin);
  }

  var scripts = this.config.getMatchingScripts(function(script) {
    return GM_util.scriptMatchesUrlAndRuns(script, url, aRunWhen);
  });
  if (scripts.length > 0) {
    this.injectScripts(scripts, url, aWrappedContentWin);
    this._config.checkScriptsForRemoteUpdates(scripts);
  }
};

service.prototype.ignoreNextScript = function() {
  this._ignoreNextScript = true;
};

service.prototype.injectScripts = function(
    scripts, url, wrappedContentWin
) {
  var chromeWin = getChromeWinForContentWin(wrappedContentWin);
  var firebugConsole = getFirebugConsole(wrappedContentWin, chromeWin);

  for (var i = 0, script = null; script = scripts[i]; i++) {
    if (GM_util.inArray(script.grants, 'none')) {
      // Create a script node.
      var scriptNode = wrappedContentWin.document.createElement('script');
      scriptNode.setAttribute('type', 'application/javascript;version=1.8');
      scriptNode.setAttribute('src', [
          'greasemonkey-script:', script.uuid, '/', script.name, '.user.js'
          ].join(''));
      // Append it to the document to execute, remove it to clean up.
      var insertPoint = wrappedContentWin.document.documentElement.firstChild;
      insertPoint.appendChild(scriptNode);
      insertPoint.removeChild(scriptNode);
    } else {
      var sandbox = createSandbox(
          script, wrappedContentWin, chromeWin, firebugConsole, url);
      var scriptSrc = GM_util.getScriptSource(script);
      if (!script.unwrap) scriptSrc = anonWrap(scriptSrc);
      if (!runScriptInSandbox(scriptSrc, sandbox, script) && script.unwrap) {
        // Wrap anyway on early return.
        runScriptInSandbox(anonWrap(scriptSrc), sandbox, script);
      }
    }
  }
};

service.prototype.withAllMenuCommandsForWindowId = function(
    aContentWindowId, aCallback, aForce
) {
  if(!aContentWindowId && !aForce) return;

  var l = gMenuCommands.length - 1;
  for (var i = l, command = null; command = gMenuCommands[i]; i--) {
    if (aForce
        || (command.contentWindowId == aContentWindowId)
    ) {
      aCallback(i, command);
    }
  }
};

//////////////////////////// Component Registration ////////////////////////////

var NSGetFactory = XPCOMUtils.generateNSGetFactory([service]);
