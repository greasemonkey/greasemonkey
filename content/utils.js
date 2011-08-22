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

function GM_getEnabled() {
  return GM_prefRoot.getValue("enabled", true);
}

function GM_setEnabled(enabled) {
  GM_prefRoot.setValue("enabled", enabled);
}

// Open the add-ons manager and show the installed user scripts.
if (typeof GM_OpenScriptsMgr == "undefined") {
  function GM_OpenScriptsMgr() { BrowserOpenAddonsMgr('userscripts'); }
}
