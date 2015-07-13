Components.utils.import('chrome://greasemonkey-modules/content/prefmanager.js');

var EXPORTED_SYMBOLS = ['getEnabled'];

function getEnabled() {
  return GM_prefRoot.getValue("enabled", true);
}
