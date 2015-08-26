'use strict';

const EXPORTED_SYMBOLS = ['AbstractScript'];

const gAboutBlankRegexp = /^about:blank/;

const Cu = Components.utils;

Cu.import('chrome://greasemonkey-modules/content/third-party/convert2RegExp.js');
Cu.import('chrome://greasemonkey-modules/content/third-party/MatchPattern.js');
Cu.import('chrome://greasemonkey-modules/content/util.js');

function AbstractScript() {

}

Object.defineProperty(AbstractScript.prototype, "globalExcludes", {
  get: function() {
    return [];
  },
  configurable: true
});

AbstractScript.prototype.matchesURL = function(url) {
  var uri = GM_util.uriFromUrl(url);

  function testClude(glob) {
    // Do not run in about:blank unless _specifically_ requested. See #1298
    if (gAboutBlankRegexp.test(url) && !gAboutBlankRegexp.test(glob)) {
      return false;
    }

    return GM_convert2RegExp(glob, uri).test(url);
  }
  function testMatch(matchPattern) {
    if ('string' == typeof matchPattern)
      matchPattern = new MatchPattern(matchPattern);
    return matchPattern.doMatch(url);
  }

  // Flat deny if URL is not greaseable, or matches global excludes.
  if (!GM_util.isGreasemonkeyable(url)) return false;

  if (this.globalExcludes.some(testClude)) return false;

  // Allow based on user cludes.
  if (this.userExcludes.some(testClude)) return false;
  if (this.userIncludes.some(testClude) || this.userMatches.some(testMatch))
    return true;

  // Finally allow based on script cludes and matches.
  if (this.excludes.some(testClude)) return false;
  return (this.includes.some(testClude) || this.matches.some(testMatch));
};
