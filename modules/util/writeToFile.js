Components.utils.import('resource://gre/modules/NetUtil.jsm');
Components.utils.import('chrome://greasemonkey-modules/content/constants.js');

var EXPORTED_SYMBOLS = ['writeToFile'];

var NORMAL_FILE_TYPE = Components.interfaces.nsIFile.NORMAL_FILE_TYPE;
//                   PR_WRONLY PR_CREATE_FILE PR_TRUNCATE
var STREAM_FLAGS = 0x02      | 0x08         | 0x20;

var converter = Components
    .classes["@mozilla.org/intl/scriptableunicodeconverter"]
    .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
converter.charset = "UTF-8";


/** Given string data and an nsIFile, write it safely to that file. */
function writeToFile(aData, aFile, aCallback) {
  // Assume aData is a string; convert it to a UTF-8 stream.
  var istream = converter.convertToInputStream(aData);

  // Create a temporary file (stream) to hold the data.
  var tmpFile = aFile.clone();
  tmpFile.createUnique(NORMAL_FILE_TYPE, GM_constants.fileMask);
  var ostream = Components
      .classes["@mozilla.org/network/safe-file-output-stream;1"]
      .createInstance(Components.interfaces.nsIFileOutputStream);
  ostream.init(tmpFile, STREAM_FLAGS, GM_constants.fileMask, 0);
  if (aFile.leafName.match(/\.user\.js$/)) {
    ostream.write('\u00EF\u00BB\u00BF', 3); // UTF-8 BOM
  }

  NetUtil.asyncCopy(istream, ostream, function(status) {
    if (Components.isSuccessCode(status)) {
      // On successful write, move it to the real location.
      tmpFile.moveTo(aFile.parent, aFile.leafName);

      if (aCallback) aCallback();
    }
  });
}
