Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import('resource://greasemonkey/util.js');

const EXPORTED_SYMBOLS = ['getPreferredLocale'];

var preferredLocale = (function() {
  var matchOS = Services.prefs.getBoolPref("intl.locale.matchOS");

  if (matchOS)
    return Services.locale.getLocaleComponentForUserAgent();

  return Services.prefs.getCharPref("general.useragent.locale") || "en-US";
})();

function getPreferredLocale() {
  return preferredLocale;
}
