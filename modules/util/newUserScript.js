Components.utils.import('chrome://greasemonkey-modules/content/util.js');

var EXPORTED_SYMBOLS = ['newUserScript'];

var gWindowWatcher = Components
    .classes["@mozilla.org/embedcomp/window-watcher;1"]
    .getService(Components.interfaces.nsIWindowWatcher);

function newUserScript(aWin) {
  gWindowWatcher.openWindow(aWin,
      "chrome://greasemonkey/content/newscript.xul", null,
      "chrome,dependent,centerscreen,resizable,dialog", null);
}
