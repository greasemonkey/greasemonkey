/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is AdBlock for Mozilla.
 *
 * The Initial Developer of the Original Code is
 * Henrik Aasted Sorensen.
 * Portions created by the Initial Developer are Copyright (C) 2002
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * Henrik Aasted Sorensen <henrik@aasted.org>
 * Stefan Kinitz <mcmurmel.blah@gmx.de>
 * Rue <quill@ethereal.net>
 *
 * ***** END LICENSE BLOCK ***** */

Components.utils.import('resource://greasemonkey/util.js');

var EXPORTED_SYMBOLS = ['GM_convert2RegExp'];
var tldRegExp = /^([^:]+:\/\/[^\/]+)\.tld(\/.*)?$/;

var eTldService = Components
    .classes["@mozilla.org/network/effective-tld-service;1"]
    .getService(Components.interfaces.nsIEffectiveTLDService);


// Exposed outer method takes regex as string, and handles the magic TLD.
// (Can't memoize a URI object, yet we want to do URL->URI outside this method,
// once for efficiency.  Compromise: memoize just the internal string handling.)
function GM_convert2RegExp(pattern, uri) {
  var reStr = GM_convert2RegExpInner(pattern);

  if (uri && reStr.match(tldRegExp)) {
    var tld = null;
    try {
      tld = eTldService.getPublicSuffix(uri);
    } catch (e) {
      // There are expected failure modes, i.e. bare hostname -- like
      // http://localhost/ -- has no TLD.
    }
    if (tld) {
      reStr = reStr.replace(tldRegExp, '$1.' + tld + '$2');
    }
  }

  return new RegExp(reStr + "$", "i");
}


// Memoized internal implementation just does glob -> regex translation.
function GM_convert2RegExpInner(pattern) {
  var s = new String(pattern);

  if ('/' == s.substr(0, 1) && '/' == s.substr(-1, 1)) {
    // Leading and trailing slash means raw regex.
    return new RegExp(s.substring(1, s.length - 1), 'i');
  }

  var res = "^";

  for (var i = 0 ; i < s.length ; i++) {
    switch(s[i]) {
      case "*" :
        res += ".*";
        break;

      case "." :
      case "?" :
      case "^" :
      case "$" :
      case "+" :
      case "{" :
      case "}" :
      case "[" :
      case "]" :
      case "|" :
      case "(" :
      case ")" :
      case "\\" :
        res += "\\" + s[i];
        break;

      case " " :
        // Remove spaces from URLs.
        break;

      default :
        res += s[i];
        break;
    }
  }

  return res + "$";
}
GM_convert2RegExpInner = GM_util.memoize(GM_convert2RegExpInner);
