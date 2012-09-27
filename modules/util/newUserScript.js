Components.utils.import('resource://greasemonkey/parseScript.js');
Components.utils.import('resource://greasemonkey/util.js');

const EXPORTED_SYMBOLS = ['newUserScript'];

const gClipboard = Components.classes["@mozilla.org/widget/clipboard;1"]
.getService(Components.interfaces.nsIClipboard);
const gWindowWatcher = Components
    .classes["@mozilla.org/embedcomp/window-watcher;1"]
    .getService(Components.interfaces.nsIWindowWatcher);

function newUserScript(aWin) {
  var clipText = '';
  try {
    var transferable = Components.classes["@mozilla.org/widget/transferable;1"]
        .createInstance(Components.interfaces.nsITransferable);
    transferable.addDataFlavor('text/unicode');
    gClipboard.getData(transferable, gClipboard.kGlobalClipboard);
    var str = new Object(), strLen = new Object();
    transferable.getTransferData('text/unicode', str, strLen);
    if (str) {
      str = str.value.QueryInterface(Components.interfaces.nsISupportsString);
      clipText = str.data.substring(0, strLen.value / 2);
    }
  } catch (e) {
    dump('Error reading clipboard:\n' + e + '\n');
  }

  // If there is a valid script with metadata on the clipboard ...
  if (clipText && extractMeta(clipText)) {
    // ... just install it!
    GM_util.installScriptFromSource(clipText);
  } else {
    // Otherwise do GUIfied script creation.
    gWindowWatcher.openWindow(aWin,
        "chrome://greasemonkey/content/newscript.xul", null,
        "chrome,dependent,centerscreen,resizable,dialog", null);
  }
}
