Components.utils.import('chrome://greasemonkey-modules/content/prefmanager.js');

var EXPORTED_SYMBOLS = ['isGreasemonkeyable'];

var ioService = Components.classes["@mozilla.org/network/io-service;1"]
    .getService(Components.interfaces.nsIIOService);

function isGreasemonkeyable(url) {
  var scheme = ioService.extractScheme(url);

  switch (scheme) {
    case "http":
    case "https":
    case "ftp":
    case "view-source":
      return true;
    case "about":
      // Always allow "about:blank" and "about:reader".
      if (/^about:(blank|reader)/.test(url)) return true;
      // Never allow the rest of "about:".  See #1375.
      return false;
    case "data":
      return GM_prefRoot.getValue('dataIsGreaseable');
    case "file":
      return GM_prefRoot.getValue('fileIsGreaseable');
    case "unmht":
      return GM_prefRoot.getValue('unmhtIsGreaseable');
  }

  return false;
}
