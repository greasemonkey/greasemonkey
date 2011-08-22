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
  try {
  // Turn the file:/// URL into an nsIFile ...
  var ioService = Components.classes["@mozilla.org/network/io-service;1"]
      .getService(Components.interfaces.nsIIOService);
  var uri = ioService.newURI(Components.stack.filename, null, null);
  var file = uri.QueryInterface(Components.interfaces.nsIFileURL).file
  // ... to find the containing directory.
  var dir = file.parent.parent;
  // Then get the URL back for that path.
  return ioService.newFileURI(dir).spec;
  } catch (e) { dump(e+'\n'+uneval(e)+'\n\n'); return 'x'; }
})();

var gMaxJSVersion = "1.6";
var gMenuCommands = [];
var gStartupHasRun = false;

/////////////////////// Component-global Helper Functions //////////////////////

function alert(msg) {
  Cc["@mozilla.org/embedcomp/prompt-service;1"]
    .getService(Ci.nsIPromptService)
    .alert(null, "Greasemonkey alert", msg);
}

// Examines the stack to determine if an API should be callable.
function GM_apiLeakCheck(apiName) {
  var stack = Components.stack;

  do {
    // Valid locations for GM API calls are:
    //  * Greasemonkey modules.
    //  * Greasemonkey chrome.
    //  * Greasemonkey extension by path. (FF 3 does this instead of the above.)
    // Anything else on the stack and we will reject the API, to make sure that
    // the content window (whose path would be e.g. http://...) has no access.
    if (2 == stack.language
        && stack.filename.substr(0, 24) !== 'resource://greasemonkey/'
        && stack.filename.substr(0, 22) !== 'chrome://greasemonkey/'
        && stack.filename.substr(0, gExtensionPath.length) !== gExtensionPath
        ) {
      GM_logError(new Error("Greasemonkey access violation: " +
          "unsafeWindow cannot call " + apiName + "."));
      return false;
    }

    stack = stack.caller;
  } while (stack);

  return true;
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
        && chromeWin.Firebug.getConsoleByGlobal(wrappedContentWin)
        || null;
  } catch (e) {
    dump('Greasemonkey: Failure Firebug console:\n' + uneval(e) + '\n');
    return null;
  }
}

function isTempScript(uri) {
  if (uri.scheme != "file") return false;

  var fph = Components.classes["@mozilla.org/network/protocol;1?name=file"]
      .getService(Ci.nsIFileProtocolHandler);

  var file = fph.getFileFromURLSpec(uri.spec);
  var tmpDir = Components.classes["@mozilla.org/file/directory_service;1"]
      .getService(Components.interfaces.nsIProperties)
      .get("TmpD", Components.interfaces.nsILocalFile);

  return file.parent.equals(tmpDir) && file.leafName != "newscript.user.js";
}

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
        GM_logError(
             e, // error obj
             0, // 0 = error (1 = warning)
             err.uri, err.lineNumber);
      } else {
        GM_logError(e);
      }
    } catch (e) {
      // Do not raise (this would stop all scripts), log.
      GM_logError(e);
    }
  }
  return true; // did not need a (function() {...})() enclosure.
}

function startup() {
  if (gStartupHasRun) return;
  gStartupHasRun = true;

  Cu.import(gmRunScriptFilename);
  Cu.import("resource://greasemonkey/prefmanager.js");
  Cu.import("resource://greasemonkey/util.js");  // At top = fail in FF3.

  var loader = Cc["@mozilla.org/moz/jssubscript-loader;1"]
      .getService(Ci.mozIJSSubScriptLoader);
  loader.loadSubScript("chrome://global/content/XPCNativeWrapper.js");
  loader.loadSubScript("chrome://greasemonkey/content/utils.js");
  loader.loadSubScript("chrome://greasemonkey/content/config.js");
  loader.loadSubScript("chrome://greasemonkey/content/script.js");
  loader.loadSubScript("chrome://greasemonkey/content/scriptrequire.js");
  loader.loadSubScript("chrome://greasemonkey/content/scriptresource.js");
  loader.loadSubScript("chrome://greasemonkey/content/scripticon.js");
  loader.loadSubScript("chrome://greasemonkey/content/miscapis.js");
  loader.loadSubScript("chrome://greasemonkey/content/xmlhttprequester.js");
  loader.loadSubScript("chrome://greasemonkey/content/scriptdownloader.js");
  loader.loadSubScript("chrome://greasemonkey/content/third-party/mpl-utils.js");

  // Firefox 3.6 and higher supports 1.8.
  if (GM_compareFirefoxVersion("3.6") >= 0) {
    gMaxJSVersion = "1.8";
  }

  // Firefox <4 reports a different stack.fileName for the module.
  if (GM_compareFirefoxVersion("4.0") < 0) {
    // Pull the name out of the variable the module exports.
    gmRunScriptFilename = GM_runScript_filename;
  }
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

/////////////////////////////////// Privates ///////////////////////////////////

service.prototype._openInTab = function(
    safeContentWin, chromeWin, url, aLoadInBackground
) {
  if (!GM_apiLeakCheck("GM_openInTab")) {
    return undefined;
  }
  if ('undefined' == typeof aLoadInBackground) aLoadInBackground = null;

  var browser = chromeWin.gBrowser;
  var tabs = browser.mTabs /* Firefox <=3.6 */ || browser.tabs /* >=4.0 */;
  var currentTab = tabs[
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

service.prototype._registerMenuCommand = function(
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
      contentWindowId: GM_windowId(wrappedContentWin),
      frozen: false};
  gMenuCommands.push(command);
};

/////////////////////////////// nsIContentPolicy ///////////////////////////////

service.prototype.shouldLoad = function(ct, cl, org, ctx, mt, ext) {
  var ret = Ci.nsIContentPolicy.ACCEPT;

  // Don't intercept anything when GM is not enabled.
  if (!GM_getEnabled()) {
    return ret;
  }

  // Don't interrupt the "view-source:" scheme (which is
  // triggered if the link in the error console is clicked).
  if ("view-source" == cl.scheme) {
    return ret;
  }

  if ((ct == Ci.nsIContentPolicy.TYPE_DOCUMENT
       || ct == Ci.nsIContentPolicy.TYPE_SUBDOCUMENT)
      && cl.spec.match(/\.user\.js$/)
  ) {
    if (!this.ignoreNextScript_
        && !isTempScript(cl)
        && GM_installUri(cl, ctx.contentWindow)
    ) {
      ret = Ci.nsIContentPolicy.REJECT_REQUEST;
    }
  }

  this.ignoreNextScript_ = false;
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
      startup();
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
  if (!contentWindowId) return;
  this.withAllMenuCommandsForWindowId(null, function(index, command) {
    var closed = false;
    try { closed = command.contentWindow.closed; } catch (e) { }

    if (closed || (command.contentWindowId == contentWindowId)) {
      gMenuCommands.splice(index, 1);
    }
  });
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

service.prototype.runScripts = function(
    aRunWhen, aWrappedContentWin, aChromeWin
) {
  var url = aWrappedContentWin.document.location.href;
  if (!GM_getEnabled() || !GM_isGreasemonkeyable(url)) return;

  if (GM_prefRoot.getValue('enableScriptRefreshing')) {
    this._config.updateModifiedScripts(aWrappedContentWin, aChromeWin);
  }

  var scripts = this.config.getMatchingScripts(function(script) {
        return GM_scriptMatchesUrlAndRuns(script, url, aRunWhen);
    });
  if (scripts.length > 0) {
    this.injectScripts(scripts, url, aWrappedContentWin, aChromeWin);
  }
};

service.prototype.ignoreNextScript = function() {
  this.ignoreNextScript_ = true;
};

service.prototype.injectScripts = function(
    scripts, url, wrappedContentWin, chromeWin
) {
  var sandbox;
  var script;
  var logger;
  var console;
  var storage;
  var xmlhttpRequester;
  var resources;
  var unsafeContentWin = wrappedContentWin.wrappedJSObject;
  var firebugConsole = getFirebugConsole(wrappedContentWin, chromeWin);

  for (var i = 0; script = scripts[i]; i++) {
    sandbox = new Components.utils.Sandbox(wrappedContentWin);

    logger = new GM_ScriptLogger(script);

    console = firebugConsole ? firebugConsole : new GM_console(script);

    storage = new GM_ScriptStorage(script);
    xmlhttpRequester = new GM_xmlhttpRequester(
        wrappedContentWin, chromeWin, url);
    resources = new GM_Resources(script);

    sandbox.unsafeWindow = unsafeContentWin;

    // hack XPathResult since that is so commonly used
    sandbox.XPathResult = Ci.nsIDOMXPathResult;

    // add our own APIs
    sandbox.GM_addStyle = function(css) {
          GM_addStyle(wrappedContentWin.document, css);
        };
    sandbox.GM_log = GM_util.hitch(logger, "log");
    sandbox.console = console;
    sandbox.GM_setValue = GM_util.hitch(storage, "setValue");
    sandbox.GM_getValue = GM_util.hitch(storage, "getValue");
    sandbox.GM_deleteValue = GM_util.hitch(storage, "deleteValue");
    sandbox.GM_listValues = GM_util.hitch(storage, "listValues");
    sandbox.GM_getResourceURL = GM_util.hitch(resources, "getResourceURL");
    sandbox.GM_getResourceText = GM_util.hitch(resources, "getResourceText");
    sandbox.GM_openInTab = GM_util.hitch(
        this, "_openInTab", wrappedContentWin, chromeWin);
    sandbox.GM_xmlhttpRequest = GM_util.hitch(xmlhttpRequester,
                                         "contentStartRequest");
    sandbox.GM_registerMenuCommand = GM_util.hitch(
        this, "_registerMenuCommand", wrappedContentWin, chromeWin, script);

    // Re-wrap the window before assigning it to the sandbox.__proto__
    // This is a workaround for a bug in which the Security Manager
    // vetoes the use of eval.
    sandbox.__proto__ = new XPCNativeWrapper(unsafeContentWin);

    Components.utils.evalInSandbox(
        "var document = window.document;", sandbox);

    // Temporary workaround for #1318.  TODO: Remove when upstream bug fixed.
    sandbox.alert = alert;

    var requires = [];
    var offsets = [];
    var offset = 0;

    script.requires.forEach(function(req){
      var contents = req.textContent;
      var lineCount = contents.split("\n").length;
      requires.push(contents);
      offset += lineCount;
      offsets.push(offset);
    });
    script.offsets = offsets;

    // These newlines are critical for error line calculation.  The last handles
    // a script whose final line is a line comment, to not break the wrapper
    // function.
    var scriptSrc = requires.join("\n") + "\n" + script.textContent + "\n";
    if (!script.unwrap) {
      scriptSrc = "(function(){"+ scriptSrc +"})()";
    }
    if (!runScriptInSandbox(scriptSrc, sandbox, script) && script.unwrap) {
      // Wrap anyway on early return.
      runScriptInSandbox("(function(){"+ scriptSrc +"})()", sandbox, script);
    }
  }
};

service.prototype.withAllMenuCommandsForWindowId = function(
    contentWindowId, callback
) {
  var l = gMenuCommands.length - 1;
  for (var i = l, command = null; command = gMenuCommands[i]; i--) {
    if (!contentWindowId
        || (command.contentWindowId == contentWindowId)
    ) {
      callback(i, command);
    }
  }
};

//////////////////////////// Component Registration ////////////////////////////

if (XPCOMUtils.generateNSGetFactory) {
  // Firefox >= 4
  var NSGetFactory = XPCOMUtils.generateNSGetFactory([service]);
} else {
  // Firefox <= 3.6.*
  var NSGetModule = XPCOMUtils.generateNSGetModule([service]);
}
