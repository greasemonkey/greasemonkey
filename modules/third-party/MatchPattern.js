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

var EXPORTED_SYMBOLS = ['MatchPattern'];

Components.utils.import("resource://greasemonkey/third-party/convert2RegExp.js");
Components.utils.import("resource://greasemonkey/util.js");

var validSchemes = ['http', 'https', 'ftp', 'file'];
var REG_HOST = /^(?:\*\.)?[^*\/]+$|^\*$|^$/;
var getString = (function() {
  var stringBundleService = Components.classes["@mozilla.org/intl/stringbundle;1"]
      .getService(Components.interfaces.nsIStringBundleService);
  return stringBundleService.createBundle(
      'chrome://greasemonkey/locale/greasemonkey.properties')
      .GetStringFromName;
})();

// For the format of "pattern", see:
//   http://code.google.com/chrome/extensions/match_patterns.html
function MatchPattern(pattern) {
  this._pattern = pattern;

  // Special case "<all_urls>".
  if (pattern == "<all_urls>") {
    this._all = true;
    this._scheme = "all_urls";
    return;
  }

  // Special case wild scheme.
  if (pattern[0] == "*") {
    this._wildScheme = true;
    // Forge http, to satisfy the URI parser, and get a host.
    pattern = "http" + pattern.slice(1);
  }

  var uri = GM_util.uriFromUrl(pattern);
  if (!uri) {
    throw new Error(getString("error.matchPattern.parse"));
  }

  var scheme = this._wildScheme ? "all" : uri.scheme;
  if (scheme != "all" && validSchemes.indexOf(scheme) == -1) {
    throw new Error(getString("error.matchPattern.scheme"));
  }

  var host = uri.host;
  if (!REG_HOST.test(host)) {
    throw new Error(getString("error.matchPattern.host"));
  }

  var path = uri.path;
  if (path[0] !== "/") {
    throw new Error(getString("error.matchPattern.path"));
  }

  this._scheme = scheme;
  if (host) {
    this._hostExpr = GM_convert2RegExp(host.replace(/^\*\./, "*"));
  } else {
    // If omitted, then it means "", an alias for localhost.
    this._hostExpr = /^$/;
  }
  this._pathExpr = GM_convert2RegExp(path, false, true);
}

MatchPattern.prototype.__defineGetter__('pattern',
function MatchPattern_getPattern() { return '' + this._pattern; });

MatchPattern.prototype.doMatch = function(uriSpec) {
  var matchURI = GM_util.uriFromUrl(uriSpec);

  if (validSchemes.indexOf(matchURI.scheme) == -1) {
    return false;
  }

  if (this._all) {
    return true;
  }
  if (!this._wildScheme && this._scheme != matchURI.scheme) {
    return false;
  }
  return this._hostExpr.test(matchURI.host)
      && this._pathExpr.test(matchURI.path);
};
