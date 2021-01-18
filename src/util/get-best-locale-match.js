'use strict';
// This function tries to find the best matching locale.
// Locales should be given in the form "lang[-COUNTRY]".
// If an exact match (i.e. both lang and country match) can be found, it is
// returned. Otherwise, a partial match based on the lang part is attempted.
// Partial matches without country are preferred over lang matches with
// non-matching country.
// If no locale matches, null is returned.
function getBestLocaleMatch(aPreferred, aAvailable) {
  aPreferred = aPreferred.toLowerCase();

  var preferredLang = aPreferred.split("-")[0];

  var langMatch = null;
  var partialMatch = null;
  for (var i = 0, current; current = aAvailable[i]; i++) {
    // Both lang and country match
    if (current.toLowerCase() == aPreferred)
      return current;

    if (current.toLowerCase() == preferredLang) {
      // Only lang matches, no country
      langMatch = current;
    } else if (current.split("-")[0].toLowerCase() == preferredLang) {
      // Only lang matches, non-matching country
      partialMatch = current;
    }
  }

  return langMatch || partialMatch;
}
