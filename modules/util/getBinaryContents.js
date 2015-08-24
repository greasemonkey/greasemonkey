var EXPORTED_SYMBOLS = ['getBinaryContents'];

Components.utils.import('resource://gre/modules/Services.jsm');
Components.utils.import('chrome://greasemonkey-modules/content/util.js');


function getBinaryContents(aFile) {
  var channel = GM_util.channelFromUri(GM_util.getUriFromFile(aFile));
  var input = channel.open();

  var bstream = Components.classes["@mozilla.org/binaryinputstream;1"]
      .createInstance(Components.interfaces.nsIBinaryInputStream);
  bstream.setInputStream(input);

  return bstream.readBytes(bstream.available());
}
