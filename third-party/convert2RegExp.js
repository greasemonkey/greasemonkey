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

(function() {
const tldRegExp = /^([^:]+:\/\/[^\/]+)\\.tld(\/.*)?$/;

// Exposed outer method takes regex as string, and handles the magic TLD.
function GM_convert2RegExp(pattern, uri, forceGlob) {
  const s = String(pattern);

  if (!forceGlob && '/' == s.substr(0, 1) && '/' == s.substr(-1, 1)) {
    // Leading and trailing slash means raw regex.
    return new RegExp(s.substring(1, s.length - 1), 'i');
  }

  let res = "^";

  for (let i = 0 ; i < s.length ; i++) {
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


  // TODO: Accurate ".tld" support; blocked by http://bugzil.la/1315558
  res = res.replace(tldRegExp, '$1(.[a-z]{1,6}){1,3}$2');

  return new RegExp(res + "$", "i");
}
window.GM_convert2RegExp = GM_convert2RegExp;

})();
