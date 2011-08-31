Components.utils.import('resource://greasemonkey/util.js');

const EXPORTED_SYMBOLS = ['sha1'];

function sha1(unicode) {
  var unicodeConverter = Components
      .classes["@mozilla.org/intl/scriptableunicodeconverter"]
      .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
  unicodeConverter.charset = "UTF-8";

  var data = unicodeConverter.convertToByteArray(unicode, {});
  var ch = Components.classes["@mozilla.org/security/hash;1"]
      .createInstance(Components.interfaces.nsICryptoHash);
  ch.init(ch.SHA1);
  ch.update(data, data.length);
  var hash = ch.finish(false); // hash as raw octets

  var hex = [];
  for (var i = 0; i < hash.length; i++) {
    hex.push( ("0" + hash.charCodeAt(i).toString(16)).slice(-2) );
  }
  return hex.join('');
}
sha1 = GM_util.memoize(sha1);
