Components.utils.import('resource://greasemonkey/util.js');

var EXPORTED_SYMBOLS = ['GM_uriFromUrl'];

function GM_uriFromUrl(url, base) {
  var ioService = Components.classes["@mozilla.org/network/io-service;1"]
      .getService(Components.interfaces.nsIIOService);
  var baseUri = null;

  if (typeof base === "string") {
    baseUri = GM_uriFromUrl(base);
  } else if (base) {
    baseUri = base;
  }

  try {
    return ioService.newURI(url, null, baseUri);
  } catch (e) {
    return null;
  }
}
GM_uriFromUrl = GM_util.memoize(GM_uriFromUrl);
