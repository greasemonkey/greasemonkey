Components.utils.import('resource://greasemonkey/util.js'); // ref'd in XUL

var gScriptId = location.hash.substring(1);
var gScript = GM_util.getService().config.getMatchingScripts(function(script) {
  return script.id == gScriptId;
})[0];

var gUserTabEl;
var gUserNoSandboxEl;
var gScriptNoSandboxEl;
var gCorsScriptIncludesEl;
var gCorsScriptExcludesEl;
var gCorsUserIncludesEl;
var gCorsUserExcludesEl;

function onAdvancedDialogLoad() {
  // I wanted "%s" but % is reserved in a DTD and I don't know the literal.
  document.title = document.title.replace('!!', gScript.name);

  var gTabboxEl = document.getElementsByTagName('tabbox')[0];
  gUserTabEl = gTabboxEl.tabs.getItemAtIndex(0);

  gCorsUserIncludesEl = document.getElementById('cors-user-includes');
  gCorsUserExcludesEl = document.getElementById('cors-user-excludes');
  gUserNoSandboxEl = document.getElementById('user-nosandbox');

  gCorsScriptIncludesEl = document.getElementById('cors-script-includes');
  gCorsScriptExcludesEl = document.getElementById('cors-script-excludes');
  gScriptNoSandboxEl = document.getElementById('script-nosandbox');

  gCorsScriptIncludesEl.pages = gScript.corsIncludes;
  gCorsScriptIncludesEl.onAddUserExclude = function(url) {
    gCorsUserExcludesEl.addPage(url);
    gTabboxEl.selectedTab = gUserTabEl;
  };
  gCorsUserIncludesEl.pages = gScript.corsUserIncludes;

  gUserNoSandboxEl.checked = gScript.userNosandbox;
  gScriptNoSandboxEl.checked = gScript.nosandbox;

  gCorsScriptExcludesEl.pages = gScript.corsExcludes;
  gCorsScriptExcludesEl.onAddUserInclude = function(url) {
    gCorsUserIncludesEl.addPage(url);
    gTabboxEl.selectedTab = gUserTabEl;
  };

  gCorsUserExcludesEl.pages = gScript.corsUserExcludes;
}

function onAdvancedDialogAccept() {
  gScript.corsExcludes = gCorsScriptExcludesEl.pages;
  gScript.corsIncludes = gCorsScriptIncludesEl.pages;
  gScript.corsUserExcludes = gCorsUserExcludesEl.pages;
  gScript.corsUserIncludes = gCorsUserIncludesEl.pages;
  gScript.userNosandbox = gUserNoSandboxEl.checked;
  gScript.nosandbox = gScriptNoSandboxEl.checked;
  GM_util.getService().config._changed(gScript, "cludes");
  return true;
}

