Components.utils.import('chrome://greasemonkey-modules/content/util.js');

var EXPORTED_SYMBOLS = ['getBinaryContents'];

var ioService = Components.classes["@mozilla.org/network/io-service;1"]
    .getService(Components.interfaces.nsIIOService);

function getBinaryContents(file) {
  var channel = ioService.newChannelFromURI(GM_util.getUriFromFile(file));
  var input = channel.open();

  var bstream = Components.classes["@mozilla.org/binaryinputstream;1"]
      .createInstance(Components.interfaces.nsIBinaryInputStream);
  bstream.setInputStream(input);

  return bstream.readBytes(bstream.available());
}
