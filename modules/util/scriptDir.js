Components.utils.import('chrome://greasemonkey-modules/content/constants.js');
Components.utils.import('chrome://greasemonkey-modules/content/util.js');

const EXPORTED_SYMBOLS = ['scriptDir'];

const SCRIPT_DIR = Components
    .classes["@mozilla.org/file/directory_service;1"]
    .getService(Components.interfaces.nsIProperties)
    .get("ProfD", Components.interfaces.nsIFile);
SCRIPT_DIR.append("gm_scripts");
if (!SCRIPT_DIR.exists()) {
  SCRIPT_DIR.create(
      Components.interfaces.nsIFile.DIRECTORY_TYPE,
      GM_constants.directoryMask);
}
SCRIPT_DIR.normalize();  // in case of symlinks


function scriptDir() {
  return SCRIPT_DIR.clone();
}
