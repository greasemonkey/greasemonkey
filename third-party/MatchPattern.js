/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
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
 * The Original Code is Page Modifications code.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   David Dahl <ddahl@mozilla.com>
 *   Drew Willcoxon <adw@mozilla.com>
 *   Erik Vold <erikvvold@gmail.com>
 *   Nils Maier <maierman@web.de>
 *   Anthony Lieuallen <arantius@gmail.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

(function() {

const validProtocols = ['http:', 'https:', 'ftp:', 'file:'];
const REG_HOST = /^(?:\*\.)?[^*\/]+$|^\*$|^$/;
const REG_PARTS = new RegExp('^([a-z*]+:|\\*:)//([^/]+)?(/.*)$');

// For the format of "pattern", see:
//   http://code.google.com/chrome/extensions/match_patterns.html
function MatchPattern(pattern) {
  this._pattern = pattern;

  // Special case "<all_urls>".
  if (pattern == "<all_urls>") {
    this._all = true;
    this._protocol = "all_urls";
    return;
  } else {
    this._all = false;
  }

  let m = pattern.match(REG_PARTS);
  if (!m) {
    throw new Error("@match: Could not parse the pattern: " + pattern);
  }
  const protocol = m[1];
  this._protocol = protocol;
  let host = m[2];
  const path = m[3];

  if (protocol != "*:" && validProtocols.indexOf(protocol) == -1) {
    throw new Error(`@match: Invalid protocol (${protocol}) specified.`);
  }

  if (!host && protocol != "file:") {
    throw new Error(`@match: No host specified for (${protocol}).`)
  } else if (host && protocol == "file:") {
    throw new Error("@match: Invalid (file:) URI, missing prefix \"/\"?");
  }

  if (!REG_HOST.test(host)) {
    throw new Error("@match: Invalid host specified.");
  }

  if (path[0] !== "/") {
    throw new Error("@match: Invalid path specified.");
  }

  if (host) {
    // We have to manually create the hostname regexp (instead of using
    // GM_convert2RegExp) to properly handle *.example.tld, which should match
    // example.tld and any of its subdomains, but not anotherexample.tld.
    this._hostExpr = new RegExp("^" +
        // Two characters in the host portion need special treatment:
        //   - "." should not be treated as a wildcard, so we escape it to \.
        //   - if the hostname only consists of "*" (i.e. full wildcard),
        //     replace it with .*
        host.replace(/\./g, "\\.").replace(/^\*$/, ".*")
        // Then, handle the special case of "*." (any or no subdomain) for match
        // patterns. "*." has been escaped to "*\." by the replace above.
            .replace("*\\.", "(.*\\.)?") + "$", "i");
  } else {
    // If omitted, then it means "", used for file: protocol only
    this._hostExpr = /^$/;
  }
  this._pathExpr = GM_convert2RegExp(path, false, true);
}


MatchPattern.prototype.__defineGetter__('pattern',
function MatchPattern_getPattern() { return '' + this._pattern; });


MatchPattern.prototype.doMatch = function(url) {
  if (validProtocols.indexOf(url.protocol) == -1) return false;
  if (this._all) return true;
  if (this._protocol != '*:' && this._protocol != url.protocol) return false;

  const path = url.pathname + url.search;
  return this._hostExpr.test(url.hostname) && this._pathExpr.test(path);
};


window.MatchPattern = MatchPattern;
})();
