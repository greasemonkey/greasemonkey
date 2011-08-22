Components.utils.import("resource://gre/modules/NetUtil.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");

Components.utils.import('resource://greasemonkey/prefmanager.js');
Components.utils.import('resource://greasemonkey/util.js');
// Load module-ized methods here for legacy access.
Components.utils.import("resource://greasemonkey/utils.js");

// Define legacy methods.
var GM_consoleService = Components.classes["@mozilla.org/consoleservice;1"]
                        .getService(Components.interfaces.nsIConsoleService);

var GM_stringBundle = Components
    .classes["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .createBundle("chrome://greasemonkey/locale/gm-browser.properties");

var GM_directoryMask = parseInt('750', 8);
var GM_fileMask = parseInt('640', 8);

function GM_getService() {
  return Components
    .classes["@greasemonkey.mozdev.org/greasemonkey-service;1"]
    .getService(Components.interfaces.gmIGreasemonkeyService)
    .wrappedJSObject;
}

function GM_getConfig() {
  return GM_getService().config;
}

/**
 * Utility to create an error message in the log without throwing an error.
 */
function GM_logError(e, opt_warn, fileName, lineNumber) {
  var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
    .getService(Components.interfaces.nsIConsoleService);

  var consoleError = Components.classes["@mozilla.org/scripterror;1"]
    .createInstance(Components.interfaces.nsIScriptError);

  var flags = opt_warn ? 1 : 0;

  if ("string" == typeof e) e = new Error(e);
  // third parameter "sourceLine" is supposed to be the line, of the source,
  // on which the error happened.  we don't know it. (directly...)
  consoleError.init(e.message, fileName, null, lineNumber,
                    e.columnNumber, flags, null);

  consoleService.logMessage(consoleError);
}

function GM_log(message, force) {
  if (force || GM_prefRoot.getValue("logChrome", false)) {
    GM_consoleService.logStringMessage(message);
  }
}

function GM_parseScriptName(sourceUrl) {
  if (!sourceUrl) return '';
  var name = sourceUrl;
  name = name.substring(0, name.indexOf(".user.js"));
  name = name.substring(name.lastIndexOf("/") + 1);
  return name;
}

function GM_getTempFile() {
  var file = Components.classes["@mozilla.org/file/directory_service;1"]
        .getService(Components.interfaces.nsIProperties)
        .get("TmpD", Components.interfaces.nsILocalFile);

  file.append("gm-temp");
  file.createUnique(
      Components.interfaces.nsILocalFile.NORMAL_FILE_TYPE, GM_fileMask);

  return file;
}

function GM_getBinaryContents(file) {
    var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                              .getService(Components.interfaces.nsIIOService);

    var channel = ioService.newChannelFromURI(GM_getUriFromFile(file));
    var input = channel.open();

    var bstream = Components.classes["@mozilla.org/binaryinputstream;1"]
                            .createInstance(Components.interfaces.nsIBinaryInputStream);
    bstream.setInputStream(input);

    var bytes = bstream.readBytes(bstream.available());

    return bytes;
}

function GM_getContents(file, charset) {
  if (!charset) charset = "UTF-8";

  var ioService=Components.classes["@mozilla.org/network/io-service;1"]
    .getService(Components.interfaces.nsIIOService);
  var scriptableStream=Components
    .classes["@mozilla.org/scriptableinputstream;1"]
    .getService(Components.interfaces.nsIScriptableInputStream);
  // http://lxr.mozilla.org/mozilla/source/intl/uconv/idl/nsIScriptableUConv.idl
  var unicodeConverter = Components
    .classes["@mozilla.org/intl/scriptableunicodeconverter"]
    .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
  unicodeConverter.charset = charset;

  var channel = ioService.newChannelFromURI(GM_getUriFromFile(file));
  try {
    var input=channel.open();
  } catch (e) {
    GM_logError(new Error("Could not open file: " + file.path));
    return "";
  }

  scriptableStream.init(input);
  var str=scriptableStream.read(input.available());
  scriptableStream.close();
  input.close();

  try {
    return unicodeConverter.ConvertToUnicode(str);
  } catch( e ) {
    return str;
  }
}

function GM_getUriFromFile(file) {
  return Components.classes["@mozilla.org/network/io-service;1"]
                   .getService(Components.interfaces.nsIIOService)
                   .newFileURI(file);
}

// Remove all children from an element.
function GM_emptyEl(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function GM_isGreasemonkeyable(url) {
  var scheme = Components.classes["@mozilla.org/network/io-service;1"]
      .getService(Components.interfaces.nsIIOService)
      .extractScheme(url);

  switch (scheme) {
    case "http":
    case "https":
    case "ftp":
    case "data":
      return true;
    case "about":
      // Always allow "about:blank".
      if (/^about:blank/.test(url)) return true;
      // Never allow the rest of "about:".  See #1375.
      return false;
    case "file":
      return GM_prefRoot.getValue('fileIsGreaseable');
    case "unmht":
      return GM_prefRoot.getValue('unmhtIsGreaseable');
  }

  return false;
}

function GM_getEnabled() {
  return GM_prefRoot.getValue("enabled", true);
}

function GM_setEnabled(enabled) {
  GM_prefRoot.setValue("enabled", enabled);
}

// UTF-8 encodes input, SHA-1 hashes it and returns the 40-char hex version.
function GM_sha1(unicode) {
  var unicodeConverter = Components
      .classes["@mozilla.org/intl/scriptableunicodeconverter"]
      .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
  unicodeConverter.charset = "UTF-8";

  var data = unicodeConverter.convertToByteArray(unicode, {});
  var ch = Components.classes["@mozilla.org/security/hash;1"]
      .createInstance(Components.interfaces.nsICryptoHash);
  ch.init(ch.SHA1);
  ch.update(data, data.length);
  var hash = ch.finish(false); // hash as raw octets

  var hex = [];
  for (var i = 0; i < hash.length; i++) {
    hex.push( ("0" + hash.charCodeAt(i).toString(16)).slice(-2) );
  }
  return hex.join('');
}
GM_sha1 = GM_memoize(GM_sha1);

var GM_scriptDirCache = null;
function GM_scriptDir() {
  if (!GM_scriptDirCache) {
    GM_scriptDirCache = Components
        .classes["@mozilla.org/file/directory_service;1"]
        .getService(Components.interfaces.nsIProperties)
        .get("ProfD", Components.interfaces.nsILocalFile);
    GM_scriptDirCache.append("gm_scripts");
  }
  return GM_scriptDirCache.clone();
}

function GM_installUri(uri, contentWin) {
  var win = GM_getBrowserWindow();
  if (win && win.GM_BrowserUI) {
    win.GM_BrowserUI.startInstallScript(uri, contentWin);
    return true;
  }
  return false;
}

function GM_scriptMatchesUrlAndRuns(script, url, when) {
  return !script.pendingExec.length
      && script.enabled
      && !script.needsUninstall
      && (script.runAt == when || 'any' == when)
      && script.matchesURL(url);
}

function GM_newUserScript() {
  window.openDialog(
      "chrome://greasemonkey/content/newscript.xul", null,
      "chrome,dependent,centerscreen,resizable,dialog");
}

// Open the add-ons manager and show the installed user scripts.
if (typeof GM_OpenScriptsMgr == "undefined") {
  function GM_OpenScriptsMgr() { BrowserOpenAddonsMgr('userscripts'); }
}

function GM_windowId(win) {
  try {
    // Do not operate on chrome windows.
    win.QueryInterface(Components.interfaces.nsIDOMChromeWindow);
    return null;
  } catch (e) {
    // We want this to fail.  Catch is no-op.
  }

  try {
    // Dunno why this is necessary, but sometimes we get non-chrome windows
    // whose locations we cannot access.
    var href = win.location.href;
    if (!GM_isGreasemonkeyable(href)) return null;
  } catch (e) {
    return null;
  }

  var domWindowUtils = win
      .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
      .getInterface(Components.interfaces.nsIDOMWindowUtils);
  var windowId;
  try {
    windowId = domWindowUtils.currentInnerWindowID;
  } catch (e) { }
  if ('undefined' == typeof windowId) {
    // Firefox <4.0 does not provide this, use the document instead.
    // (Document is a property of the window, and should let us dig into the
    // "inner window" rather than always getting the same "outer window", due
    // to bfcache.  https://developer.mozilla.org/en/Inner_and_outer_windows )
    return win.document;
  }
  return windowId;
}

function GM_windowIdForEvent(aEvent) {
  var doc = aEvent.originalTarget;
  try {
    doc.QueryInterface(Components.interfaces.nsIDOMHTMLDocument);
  } catch (e) {
    return null;
  }

  return GM_windowId(doc.defaultView);
}

function GM_getBrowserWindow() {
  return Components
     .classes['@mozilla.org/appshell/window-mediator;1']
     .getService(Components.interfaces.nsIWindowMediator)
     .getMostRecentWindow("navigator:browser");
}


/** Given string data and an nsIFile, write it safely to that file. */
function GM_writeToFile(aData, aFile, aCallback) {
  //                 PR_WRONLY PR_CREATE_FILE PR_TRUNCATE
  var _streamFlags = 0x02      | 0x08         | 0x20;

  // Assume aData is a string; convert it to a UTF-8 stream.
  var converter = Components
      .classes["@mozilla.org/intl/scriptableunicodeconverter"]
      .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
  converter.charset = "UTF-8";
  var istream = converter.convertToInputStream(aData);

  // Create a temporary file (stream) to hold the data.
  var tmpFile = aFile.clone();
  tmpFile.createUnique(
      Components.interfaces.nsILocalFile.NORMAL_FILE_TYPE, GM_fileMask);
  var ostream = Components
      .classes["@mozilla.org/network/safe-file-output-stream;1"]
      .createInstance(Components.interfaces.nsIFileOutputStream);
  ostream.init(tmpFile, _streamFlags, GM_fileMask, 0);

  NetUtil.asyncCopy(istream, ostream, function(status) {
    if (Components.isSuccessCode(status)) {
      // On successful write, move it to the real location.
      tmpFile.moveTo(aFile.parent, aFile.leafName);

      if (aCallback) aCallback();
    }
  });
}
