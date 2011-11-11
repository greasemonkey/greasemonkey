Components.utils.import('resource://greasemonkey/constants.js');

const EXPORTED_SYMBOLS = ['getTempDir'];

const DIRECTORY_TYPE = Components.interfaces.nsILocalFile.DIRECTORY_TYPE;
const TMP_DIR = Components.classes["@mozilla.org/file/directory_service;1"]
    .getService(Components.interfaces.nsIProperties)
    .get("TmpD", Components.interfaces.nsILocalFile);

function getTempDir(aRoot) {
  var file = (aRoot || TMP_DIR).clone();
  file.append("gm-temp");
  file.createUnique(DIRECTORY_TYPE, GM_constants.directoryMask);
  return file;
}
