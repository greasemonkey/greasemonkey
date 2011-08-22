const EXPORTED_SYMBOLS = ['getService'];

const GM_SERVICE = Components
    .classes["@greasemonkey.mozdev.org/greasemonkey-service;1"]
    .getService(Components.interfaces.gmIGreasemonkeyService)
    .wrappedJSObject;

function getService() {
  return GM_SERVICE;
}
