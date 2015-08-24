Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import('chrome://greasemonkey-modules/content/util.js');

var EXPORTED_SYMBOLS = ['getBinaryContents'];

var ioService = Components.classes["@mozilla.org/network/io-service;1"]
    .getService(Components.interfaces.nsIIOService);

function getBinaryContents(aFile) {
  var channel = null;
  if (ioService.newChannelFromURI2) {
    channel = ioService.newChannelFromURI2(
        GM_util.getUriFromFile(aFile), null,
        Services.scriptSecurityManager.getSystemPrincipal(), null,
        Components.interfaces.nsILoadInfo.SEC_NORMAL,
        Components.interfaces.nsIContentPolicy.TYPE_OTHER);
  } else {
    channel = ioService.newChannelFromURI(GM_util.getUriFromFile(aFile));
  }
  var input = channel.open();

  var bstream = Components.classes["@mozilla.org/binaryinputstream;1"]
      .createInstance(Components.interfaces.nsIBinaryInputStream);
  bstream.setInputStream(input);

  return bstream.readBytes(bstream.available());
}
