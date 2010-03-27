// UTF-8 encodes input, SHA-1 hashes it and returns the 40-char hex version
function SHA1(unicode) {
  var unicodeConverter =
    Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].
      createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
  unicodeConverter.charset = "UTF-8";

  var data = unicodeConverter.convertToByteArray(unicode, {});
  var ch = Components.classes["@mozilla.org/security/hash;1"]
    .createInstance(Components.interfaces.nsICryptoHash);
  ch.init(ch.SHA1);
  ch.update(data, data.length);
  var hash = ch.finish(false); // hash as raw octets

  var hex = '';
  for (var i = 0; i < hash.length; i++)
    hex += ("0" + hash.charCodeAt(i).toString(16)).slice(-2);
  return hex;
}
