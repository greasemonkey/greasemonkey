Components.utils.import('chrome://greasemonkey-modules/content/util.js'); // ref'd in XUL

var gScriptId = decodeURIComponent(location.hash.substring(1));
var gScript = GM_util.getService().config.getMatchingScripts(function(script) {
  return script && (script.id == gScriptId);
})[0];

var gScriptExcludesEl;
var gScriptMatchesEl;
var gScriptIncludesEl;
var gTabboxEl;
var gUserExcludesEl;
var gUserMatchesEl;
var gUserIncludesEl;
var gUserTabEl;

window.addEventListener('load', function() {
  // I wanted "%s" but % is reserved in a DTD and I don't know the literal.
  document.title = document.title.replace('!!', gScript.localized.name);

  var gTabboxEl = document.getElementsByTagName('tabbox')[0];
  gUserTabEl = gTabboxEl.tabs.getItemAtIndex(0);

  gUserIncludesEl = document.getElementById('user-includes');
  gUserMatchesEl = document.getElementById('user-matches');
  gUserExcludesEl = document.getElementById('user-excludes');
  gScriptIncludesEl = document.getElementById('script-includes');
  gScriptMatchesEl = document.getElementById('script-matches');
  gScriptExcludesEl = document.getElementById('script-excludes');

  gScriptIncludesEl.pages = gScript.includes;
  gScriptIncludesEl.onAddUserExclude = function(url) {
    gUserExcludesEl.addPage(url);
    gTabboxEl.selectedTab = gUserTabEl;
  };
  gUserIncludesEl.pages = gScript.userIncludes;

  for (var i = 0; i < gScript.matches.length; i++) {
    gScriptMatchesEl.addPage(gScript.matches[i].pattern);
  }
  /*
  gScriptMatchesEl.onAddUserExclude = function(url) {
    gUserExcludeEl.addPage(url);
    gTabboxEl.selectedTab = gUserTabEl;
  };
  */
  for (var i = 0; i < gScript.userMatches.length; i++) {
    gUserMatchesEl.addPage(gScript.userMatches[i].pattern);
  }

  gScriptExcludesEl.pages = gScript.excludes;
  gScriptExcludesEl.onAddUserInclude = function(url) {
    gUserIncludesEl.addPage(url);
    gTabboxEl.selectedTab = gUserTabEl;
  };
  gUserExcludesEl.pages = gScript.userExcludes;
}, false);

function onDialogAccept() {
  gScript.includes = gScriptIncludesEl.pages;
  gScript.userIncludes = gUserIncludesEl.pages;
  gScript.matches = gScriptMatchesEl.pages;
  gScript.userMatches = gUserMatchesEl.pages;
  gScript.excludes = gScriptExcludesEl.pages;
  gScript.userExcludes = gUserExcludesEl.pages;
  GM_util.getService().config._changed(gScript, "cludes");
}
