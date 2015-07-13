Components.utils.import('chrome://greasemonkey-modules/content/prefmanager.js');

var EXPORTED_SYMBOLS = ['setEnabled'];

function setEnabled(enabled) {
  GM_prefRoot.setValue("enabled", enabled);
}
