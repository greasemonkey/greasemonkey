Components.utils.import('resource://greasemonkey/constants.js');

const EXPORTED_SYMBOLS = ['getTempFile'];

const NORMAL_FILE_TYPE = Components.interfaces.nsILocalFile.NORMAL_FILE_TYPE;
const TMP_DIR = Components.classes["@mozilla.org/file/directory_service;1"]
    .getService(Components.interfaces.nsIProperties)
    .get("TmpD", Components.interfaces.nsILocalFile);

function getTempFile() {
  var file = TMP_DIR.clone();
  file.append("gm-temp");
  file.createUnique(NORMAL_FILE_TYPE, GM_constants.fileMask);
  return file;
}
