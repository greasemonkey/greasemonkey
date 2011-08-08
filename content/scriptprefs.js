var gScriptId = location.hash.substring(1);
var gScript = GM_getConfig().getMatchingScripts(function(script) {
  return script.id == gScriptId;
})[0];

var gUserIncludesEl;
var gUserExcludesEl;
var gScriptIncludesEl;
var gScriptExcludesEl;

window.addEventListener('load', function() {
  // I wanted "%s" but % is reserved in a DTD and I don't know the literal.
  document.title = document.title.replace('!!', gScript.name);

  gUserIncludesEl = document.getElementById('user-includes');
  gUserExcludesEl = document.getElementById('user-excludes');
  gScriptIncludesEl = document.getElementById('script-includes');
  gScriptExcludesEl = document.getElementById('script-excludes');

  gScriptIncludesEl.pages = gScript.includes;
  gScriptIncludesEl.onAddUserExclude = function(url) {
    alert('Add user exclude for:\n'+url);
  };
  gScriptExcludesEl.pages = gScript.excludes;
  gScriptExcludesEl.onAddUserInclude = function(url) {
    alert('Add user include for:\n'+url);
  };
}, false);
