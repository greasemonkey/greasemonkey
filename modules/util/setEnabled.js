Components.utils.import('resource://greasemonkey/prefmanager.js');

const EXPORTED_SYMBOLS = ['setEnabled'];

function setEnabled(enabled) {
  GM_prefRoot.setValue("enabled", enabled);
}
