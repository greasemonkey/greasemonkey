Components.utils.import('resource://greasemonkey/constants.js');
Components.utils.import('resource://greasemonkey/prefmanager.js');
Components.utils.import('resource://greasemonkey/util.js');
// Load module-ized methods here for legacy access.
Components.utils.import("resource://greasemonkey/utils.js");

function GM_getService() {
  return Components
    .classes["@greasemonkey.mozdev.org/greasemonkey-service;1"]
    .getService(Components.interfaces.gmIGreasemonkeyService)
    .wrappedJSObject;
}

function GM_getConfig() {
  return GM_getService().config;
}

function GM_setEnabled(enabled) {
  GM_prefRoot.setValue("enabled", enabled);
}

// Open the add-ons manager and show the installed user scripts.
if (typeof GM_OpenScriptsMgr == "undefined") {
  function GM_OpenScriptsMgr() { BrowserOpenAddonsMgr('userscripts'); }
}
