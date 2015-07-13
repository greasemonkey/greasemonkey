var EXPORTED_SYMBOLS = ['getUriFromFile'];

var ioService = Components.classes["@mozilla.org/network/io-service;1"]
    .getService(Components.interfaces.nsIIOService);

function getUriFromFile(file) {
  return ioService.newFileURI(file);
}
