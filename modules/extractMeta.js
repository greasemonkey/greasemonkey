var EXPORTED_SYMBOLS = ['extractMeta'];

var gAllMetaRegexp = new RegExp(
    '^(\u00EF\u00BB\u00BF)?// ==UserScript==([\\s\\S]*?)^// ==/UserScript==', 'm');

/** Get just the stuff between ==UserScript== lines. */
function extractMeta(aSource) {
  var meta = aSource.match(gAllMetaRegexp);
  if (meta) return meta[2].replace(/^\s+/, '');
  return '';
}
