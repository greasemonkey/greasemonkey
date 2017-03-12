Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import('chrome://greasemonkey-modules/content/util.js');

var EXPORTED_SYMBOLS = ['getPreferredLocale'];

var preferredLocale = (function() {
  var matchOS = Services.prefs.getBoolPref("intl.locale.matchOS");

  if (matchOS) {
    try {
      // Firefox 54+
      // http://bugzil.la/1337551
      // http://bugzil.la/1344901
      return Components.classes["@mozilla.org/intl/ospreferences;1"]
          .getService(Components.interfaces.mozIOSPreferences)
          .systemLocale;
    } catch (e) {
      return Services.locale.getLocaleComponentForUserAgent();
    }
  }

  return Services.prefs.getCharPref("general.useragent.locale") || "en-US";
})();

function getPreferredLocale() {
  return preferredLocale;
}
