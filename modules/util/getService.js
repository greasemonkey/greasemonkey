var EXPORTED_SYMBOLS = ['getService'];

var GM_SERVICE = Components
    .classes["@greasemonkey.mozdev.org/greasemonkey-service;1"]
    .getService()
    .wrappedJSObject;

function getService() {
  return GM_SERVICE;
}
