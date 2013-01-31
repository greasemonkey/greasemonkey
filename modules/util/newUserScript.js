Components.utils.import('resource://greasemonkey/util.js');

const EXPORTED_SYMBOLS = ['newUserScript'];

const gWindowWatcher = Components
    .classes["@mozilla.org/embedcomp/window-watcher;1"]
    .getService(Components.interfaces.nsIWindowWatcher);

function newUserScript(aWin) {
  gWindowWatcher.openWindow(aWin,
      "chrome://greasemonkey/content/newscript.xul", null,
      "chrome,dependent,centerscreen,resizable,dialog", null);
}
