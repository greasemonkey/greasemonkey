Components.utils.import('chrome://greasemonkey-modules/content/constants.js');

const EXPORTED_SYMBOLS = ['getTempFile'];

const NORMAL_FILE_TYPE = Components.interfaces.nsIFile.NORMAL_FILE_TYPE;
const TMP_DIR = Components.classes["@mozilla.org/file/directory_service;1"]
    .getService(Components.interfaces.nsIProperties)
    .get("TmpD", Components.interfaces.nsIFile);

function getTempFile(aRoot, aLeaf) {
  var file = (aRoot || TMP_DIR).clone();
  file.append(aLeaf || 'gm-temp');
  file.createUnique(NORMAL_FILE_TYPE, GM_constants.fileMask);
  return file;
}
