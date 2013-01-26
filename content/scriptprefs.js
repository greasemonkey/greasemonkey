Components.utils.import('resource://greasemonkey/util.js'); // ref'd in XUL

var gScriptId = location.hash.substring(1);
var gScript = GM_util.getService().config.getMatchingScripts(function(script) {
  return script.id == gScriptId;
})[0];

var gScriptExcludesEl;
var gScriptIncludesEl;
var gTabboxEl;
var gUserExcludesEl;
var gUserIncludesEl;
var gUserNoSandboxEl;
var gScriptNoSandboxEl;
var gUserTabEl;

window.addEventListener('load', function() {
  // I wanted "%s" but % is reserved in a DTD and I don't know the literal.
  document.title = document.title.replace('!!', gScript.name);

  var gTabboxEl = document.getElementsByTagName('tabbox')[0];
  gUserTabEl = gTabboxEl.tabs.getItemAtIndex(0);

  gUserIncludesEl = document.getElementById('user-includes');
  gUserExcludesEl = document.getElementById('user-excludes');
  gUserNoSandboxEl = document.getElementById('user-nosandbox');
  gScriptIncludesEl = document.getElementById('script-includes');
  gScriptExcludesEl = document.getElementById('script-excludes');
  gScriptNoSandboxEl = document.getElementById('script-nosandbox');

  gScriptIncludesEl.pages = gScript.includes;
  gScriptIncludesEl.onAddUserExclude = function(url) {
    gUserExcludesEl.addPage(url);
    gTabboxEl.selectedTab = gUserTabEl;
  };
  gUserIncludesEl.pages = gScript.userIncludes;

  gUserNoSandboxEl.checked = gScript.userNosandbox;
  gScriptNoSandboxEl.checked = gScript.nosandbox;

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
  gScript.excludes = gScriptExcludesEl.pages;
  gScript.userExcludes = gUserExcludesEl.pages;
  gScript.userNosandbox = gUserNoSandboxEl.checked;
  gScript.nosandbox = gScriptNoSandboxEl.checked;
  GM_util.getService().config._changed(gScript, "cludes");
}
