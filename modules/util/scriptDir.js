Components.utils.import('resource://greasemonkey/util.js');

const EXPORTED_SYMBOLS = ['scriptDir'];

const SCRIPT_DIR = Components
    .classes["@mozilla.org/file/directory_service;1"]
    .getService(Components.interfaces.nsIProperties)
    .get("ProfD", Components.interfaces.nsILocalFile);
SCRIPT_DIR.append("gm_scripts");

function scriptDir() {
  return SCRIPT_DIR.clone();
}
