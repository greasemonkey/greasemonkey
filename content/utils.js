Components.utils.import('resource://greasemonkey/constants.js');
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
      Components.interfaces.nsILocalFile.NORMAL_FILE_TYPE, GM_constants.fileMask);

  return file;
}

function GM_getBinaryContents(file) {
    var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                              .getService(Components.interfaces.nsIIOService);

    var channel = ioService.newChannelFromURI(GM_util.getUriFromFile(file));
    var input = channel.open();

    var bstream = Components.classes["@mozilla.org/binaryinputstream;1"]
                            .createInstance(Components.interfaces.nsIBinaryInputStream);
    bstream.setInputStream(input);

    var bytes = bstream.readBytes(bstream.available());

    return bytes;
}

function GM_getEnabled() {
  return GM_prefRoot.getValue("enabled", true);
}

function GM_setEnabled(enabled) {
  GM_prefRoot.setValue("enabled", enabled);
}

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
  var win = GM_util.getBrowserWindow();
  if (win && win.GM_BrowserUI) {
    win.GM_BrowserUI.startInstallScript(uri, contentWin);
    return true;
  }
  return false;
}

// Open the add-ons manager and show the installed user scripts.
if (typeof GM_OpenScriptsMgr == "undefined") {
  function GM_OpenScriptsMgr() { BrowserOpenAddonsMgr('userscripts'); }
}
