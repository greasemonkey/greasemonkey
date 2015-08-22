Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import('chrome://greasemonkey-modules/content/util.js');

var EXPORTED_SYMBOLS = ['getContents'];

var ioService=Components.classes["@mozilla.org/network/io-service;1"]
    .getService(Components.interfaces.nsIIOService);
var scriptableStream=Components
    .classes["@mozilla.org/scriptableinputstream;1"]
    .getService(Components.interfaces.nsIScriptableInputStream);
var unicodeConverter = Components
    .classes["@mozilla.org/intl/scriptableunicodeconverter"]
    .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);

function getContents(aFile, aCharset, aFatal) {
  if (!aFile.isFile()) {
    throw new Error(
        'Greasemonkey tried to get contents of non-file:\n' + aFile.path);
  }
  unicodeConverter.charset = aCharset || 'UTF-8';

  var channel = null;
  if (ioService.newChannelFromURI2) {
    channel = ioService.newChannelFromURI2(
        GM_util.getUriFromFile(aFile), null,
        Services.scriptSecurityManager.getSystemPrincipal(), null,
        Components.interfaces.nsILoadInfo.SEC_NORMAL,
        Components.interfaces.nsIContentPolicy.TYPE_OTHER);
  } else {
    channel = ioService.newChannelFromURI(GM_util.getUriFromFile(aFile));
  }
  try {
    var input = channel.open();
  } catch (e) {
    GM_util.logError(new Error("Could not open file: " + aFile.path));
    return "";
  }

  scriptableStream.init(input);
  var str = scriptableStream.read(input.available());
  scriptableStream.close();
  input.close();

  try {
    return unicodeConverter.ConvertToUnicode(str);
  } catch (e) {
    if (aFatal) throw e;
    return str;
  }
}
