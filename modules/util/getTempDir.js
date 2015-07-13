Components.utils.import('chrome://greasemonkey-modules/content/constants.js');

var EXPORTED_SYMBOLS = ['getTempDir'];

var DIRECTORY_TYPE = Components.interfaces.nsIFile.DIRECTORY_TYPE;
var TMP_DIR = Components.classes["@mozilla.org/file/directory_service;1"]
    .getService(Components.interfaces.nsIProperties)
    .get("TmpD", Components.interfaces.nsIFile);

function getTempDir(aRoot) {
  var file = (aRoot || TMP_DIR).clone();
  file.append("gm-temp");
  file.createUnique(DIRECTORY_TYPE, GM_constants.directoryMask);
  return file;
}
