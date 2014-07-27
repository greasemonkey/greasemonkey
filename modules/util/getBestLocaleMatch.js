Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import('resource://greasemonkey/util.js');

const EXPORTED_SYMBOLS = ['getBestLocaleMatch'];

// This function tries to find the best matching locale.
// Locales should be given in the form "lang[-COUNTRY]".
// If an exact match (i.e. both lang and country match) can be found, it is
// returned. Otherwise, a partial match based on the lang part is attempted.
// Partial matches without country are preferred over lang matches with
// non-matching country.
// If no locale matches, null is returned.
function getBestLocaleMatch(aPreferred, aAvailable) {
  var preferredLang = aPreferred.split("-")[0];

  var langMatch, partialMatch = null;
  for (var i = 0, current; current = aAvailable[i]; i++) {
    // Both lang and country match
    if (current == aPreferred)
      return current;

    if (current == preferredLang) {
      // Only lang matches, no country
      langMatch = current;
    } else if (current.split("-")[0] == preferredLang) {
      // Only lang matches, non-matching country
      partialMatch = current;
    }
  }

  return langMatch || partialMatch;
}
