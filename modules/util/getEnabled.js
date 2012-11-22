Components.utils.import('resource://greasemonkey/prefmanager.js');

const EXPORTED_SYMBOLS = ['getEnabled'];

function getEnabled() {
  return GM_prefRoot.getValue("enabled", true);
}
