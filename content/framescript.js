// The frame script for Electrolysis (e10s) compatible injection.
//   See: https://developer.mozilla.org/en-US/Firefox/Multiprocess_Firefox

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

(function() {
// \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ //

// For every frame/process, make sure the content observer is running.

var rti = docShell.QueryInterface(Ci.nsIDocShellTreeItem).rootTreeItem;
if (rti.itemType != Ci.nsIDocShellTreeItem.typeContent)
  return;

Cu.import('resource://greasemonkey/contentObserver.js');

// \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ //

addEventListener("pagehide", contentObserver.pagehide.bind(contentObserver));
addEventListener("pageshow", contentObserver.pageshow.bind(contentObserver));

addMessageListener("greasemonkey:inject-script",
    contentObserver.runDelayedScript.bind(contentObserver));
addMessageListener("greasemonkey:menu-command-clicked",
    contentObserver.runMenuCommand.bind(contentObserver));
})();
