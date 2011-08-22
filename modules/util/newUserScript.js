const EXPORTED_SYMBOLS = ['newUserScript'];

const ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
    .getService(Components.interfaces.nsIWindowWatcher);

function newUserScript(aWin) {
  ww.openWindow(aWin,
      "chrome://greasemonkey/content/newscript.xul", null,
      "chrome,dependent,centerscreen,resizable,dialog", null);
}
