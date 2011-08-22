Components.utils.import('resource://greasemonkey/util.js');

var EXPORTED_SYMBOLS = ['uriFromUrl'];

function uriFromUrl(url, base) {
  var ioService = Components.classes["@mozilla.org/network/io-service;1"]
      .getService(Components.interfaces.nsIIOService);
  var baseUri = null;

  if (typeof base === "string") {
    baseUri = GM_util.uriFromUrl(base);
  } else if (base) {
    baseUri = base;
  }

  try {
    return ioService.newURI(url, null, baseUri);
  } catch (e) {
    return null;
  }
}
uriFromUrl = GM_util.memoize(uriFromUrl);
