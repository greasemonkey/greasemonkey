Components.utils.import('resource://greasemonkey/util.js');

const EXPORTED_SYMBOLS = ['getContents'];

const ioService=Components.classes["@mozilla.org/network/io-service;1"]
    .getService(Components.interfaces.nsIIOService);
const scriptableStream=Components
    .classes["@mozilla.org/scriptableinputstream;1"]
    .getService(Components.interfaces.nsIScriptableInputStream);
const unicodeConverter = Components
    .classes["@mozilla.org/intl/scriptableunicodeconverter"]
    .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);

function getContents(file, charset) {
  if (!charset) charset = "UTF-8";
  unicodeConverter.charset = charset;

  var channel = ioService.newChannelFromURI(GM_util.getUriFromFile(file));
  try {
    var input = channel.open();
  } catch (e) {
    GM_util.logError(new Error("Could not open file: " + file.path));
    return "";
  }

  scriptableStream.init(input);
  var str = scriptableStream.read(input.available());
  scriptableStream.close();
  input.close();

  try {
    return unicodeConverter.ConvertToUnicode(str);
  } catch (e) {
    return str;
  }
}
