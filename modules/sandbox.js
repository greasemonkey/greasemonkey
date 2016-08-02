var EXPORTED_SYMBOLS = ['createSandbox', 'runScriptInSandbox'];

var Cu = Components.utils;
var Ci = Components.interfaces;
var Cc = Components.classes;

Cu.import('chrome://greasemonkey-modules/content/GM_openInTab.js');
Cu.import('chrome://greasemonkey-modules/content/GM_setClipboard.js');
Cu.import("chrome://greasemonkey-modules/content/menucommand.js");
Cu.import("chrome://greasemonkey-modules/content/miscapis.js");
Cu.import("chrome://greasemonkey-modules/content/storageFront.js");
Cu.import("chrome://greasemonkey-modules/content/util.js");
Cu.import("chrome://greasemonkey-modules/content/xmlhttprequester.js");
Cu.import("chrome://greasemonkey-modules/content/extractMeta.js");

var gStringBundle = Cc["@mozilla.org/intl/stringbundle;1"]
    .getService(Ci.nsIStringBundleService)
    .createBundle("chrome://greasemonkey/locale/greasemonkey.properties");
var gInvalidAccesskeyErrorStr = gStringBundle
    .GetStringFromName('error.menu-invalid-accesskey');
var subLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
    .getService(Components.interfaces.mozIJSSubScriptLoader);

// Only a particular set of strings are allowed.  See: http://goo.gl/ex2LJ
var gMaxJSVersion = "ECMAv5";


function createSandbox(aScript, aContentWin, aUrl, aFrameScope) {
  if (GM_util.inArray(aScript.grants, 'none')) {
    // If there is an explicit none grant, use a plain unwrapped sandbox
    // with no other content.
    var contentSandbox = new Components.utils.Sandbox(
        aContentWin,
        {
          'sameZoneAs': aContentWin,
          'sandboxName': aScript.id,
          'sandboxPrototype': aContentWin,
          'wantXrays': false,
        });
    // GM_info is always provided.
    injectGMInfo(aScript, contentSandbox, aContentWin);

    // Alias unsafeWindow for compatibility.
    Components.utils.evalInSandbox(
        'const unsafeWindow = window;', contentSandbox);

    return contentSandbox;
  }

  var sandbox = new Components.utils.Sandbox(
      [aContentWin],
      {
        'sameZoneAs': aContentWin,
        'sandboxName': aScript.id,
        'sandboxPrototype': aContentWin,
        'wantXrays': true,
        'wantExportHelpers': true
      });

  // Note that because waivers aren't propagated between origins, we need the
  // unsafeWindow getter to live in the sandbox.  See http://bugzil.la/1043958
  var unsafeWindowGetter = new sandbox.Function(
      'return window.wrappedJSObject || window;');
  Object.defineProperty(sandbox, 'unsafeWindow', {get: unsafeWindowGetter});


  if (GM_util.inArray(aScript.grants, 'GM_addStyle')) {
    sandbox.GM_addStyle = GM_util.hitch(
        null, GM_addStyle, aContentWin.document);
  }
  if (GM_util.inArray(aScript.grants, 'GM_log')) {
    sandbox.GM_log = GM_util.hitch(new GM_ScriptLogger(aScript), 'log');
  }

  if (GM_util.inArray(aScript.grants, 'GM_registerMenuCommand')) {
    Components.utils.evalInSandbox(
        'this._MenuCommandSandbox = ' + MenuCommandSandbox.toSource(), sandbox);
    sandbox._MenuCommandSandbox(
        aScript.uuid, aScript.name, MenuCommandRespond,
        gInvalidAccesskeyErrorStr, MenuCommandEventNameSuffix);
    Components.utils.evalInSandbox(
        'delete this._MenuCommandSandbox;', sandbox);
  }

  var scriptStorage = new GM_ScriptStorageFront(aScript, aFrameScope, sandbox);
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
    sandbox.GM_getResourceURL = GM_util.hitch(
        scriptResources, 'getResourceURL', aScript);
  }
  if (GM_util.inArray(aScript.grants, 'GM_getResourceText')) {
    sandbox.GM_getResourceText = GM_util.hitch(
        scriptResources, 'getResourceText', sandbox);
  }

  if (GM_util.inArray(aScript.grants, 'GM_listValues')) {
    // Return plain (JSON) string from chrome, parse it in the sandbox,
    // to avoid issues with objects (Array) crossing security boundaries.
    sandbox._GM_listValues = GM_util.hitch(scriptStorage, 'listValues');
    Components.utils.evalInSandbox(
        'function GM_listValues() { return JSON.parse(_GM_listValues()); }',
        sandbox);
  }

  if (GM_util.inArray(aScript.grants, 'GM_openInTab')) {
    sandbox.GM_openInTab = GM_util.hitch(null, GM_openInTab, aFrameScope, aUrl);
  }

  if (GM_util.inArray(aScript.grants, 'GM_xmlhttpRequest')) {
    sandbox.GM_xmlhttpRequest = GM_util.hitch(
        new GM_xmlhttpRequester(aContentWin, aUrl, sandbox),
        'contentStartRequest');
  }

  injectGMInfo(aScript, sandbox, aContentWin);

  return sandbox;
}


function injectGMInfo(aScript, sandbox, aContentWin) {
  var rawInfo = aScript.info();
  var scriptURL = aScript.fileURL;

  rawInfo.isIncognito = GM_util.windowIsPrivate(aContentWin);
  rawInfo.isPrivate = rawInfo.isIncognito;
  
  // TODO: also delay top level clone via lazy getter? XPCOMUtils.defineLazyGetter
  sandbox.GM_info = Cu.cloneInto(rawInfo, sandbox);

  var waivedInfo = Components.utils.waiveXrays(sandbox.GM_info);
  var fileCache = new Map();

  function getScriptSource() {
    var content = fileCache.get("scriptSource");
    if (content === undefined) {
      content = GM_util.fileXhr(scriptURL, "application/javascript");
      fileCache.set("scriptSource", content);
    }
    return content;
  }

  function getMeta() {
    var meta = fileCache.get("meta");
    if (meta === undefined) {
      meta = extractMeta(getScriptSource());
      fileCache.set("meta", meta);
    }
    return meta;
  }

  // lazy getters for heavyweight strings that aren't sent down through IPC
  Object.defineProperty(waivedInfo, "scriptSource", {
    get: Cu.exportFunction(getScriptSource, sandbox)
  });

  // meta depends on content, so we need a lazy one here too
  Object.defineProperty(waivedInfo, 'scriptMetaStr', {
    get: Cu.exportFunction(getMeta, sandbox)
  });
}


function runScriptInSandbox(script, sandbox) {
  // Eval the code, with anonymous wrappers when/if appropriate.
  function evalWithWrapper(url) {
    try {
      subLoader.loadSubScript(url, sandbox, "UTF-8");
    } catch (e) {
      if ("return not in function" == e.message) {
        // See #1592; we never anon wrap anymore, unless forced to by a return
        // not in a function.
        GM_util.logError(
            gStringBundle.GetStringFromName('return-not-in-func-deprecated'),
            true, // is a warning
            e.fileName,
            e.lineNumber
            );

        var code = GM_util.fileXhr(url, "application/javascript");
        Components.utils.evalInSandbox(
            '(function(){ '+code+'\n})()', sandbox, gMaxJSVersion, url, 1);
      } else {
        // Otherwise raise.
        throw e;
      }
    }
  }

  // Eval the code, with a try/catch to report errors cleanly.
  function evalWithCatch(url) {
    try {
      evalWithWrapper(url);
    } catch (e) {
      // Log it properly.
      GM_util.logError(e, false, e.fileName, e.lineNumber);
      // Stop the script, in the case of requires, as if it was one big script.
      return false;
    }
    return true;
  }

  for (var i = 0, require = null; require = script.requires[i]; i++) {
    if (!evalWithCatch(require.fileURL)) {
      return;
    }
  }
  evalWithCatch(script.fileURL);
}


function urlToString(url) {
  var channel = NetUtil.newChannel({
      uri: NetUtil.newURI(url, "UTF-8"),
      loadUsingSystemPrincipal: true,
  });
  var stream = channel.open();

  var count = stream.available();
  var data = NetUtil.readInputStreamToString(
      stream, count, { charset : "utf-8" });
  return data;
}
