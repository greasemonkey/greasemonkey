Components.utils.import('resource://greasemonkey/prefmanager.js');

const EXPORTED_SYMBOLS = ['isGreasemonkeyable'];

const ioService = Components.classes["@mozilla.org/network/io-service;1"]
    .getService(Components.interfaces.nsIIOService);

function isGreasemonkeyable(url) {
  var scheme = ioService.extractScheme(url);

  switch (scheme) {
    case "http":
    case "https":
    case "ftp":
    case "data":
      return true;
    case "about":
      // Always allow "about:blank".
      if (/^about:blank/.test(url)) return true;
      // Never allow the rest of "about:".  See #1375.
      return false;
    case "file":
      return GM_prefRoot.getValue('fileIsGreaseable');
    case "unmht":
      return GM_prefRoot.getValue('unmhtIsGreaseable');
  }

  return false;
}
