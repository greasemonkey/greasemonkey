Components.utils.import('resource://greasemonkey/util.js');

const EXPORTED_SYMBOLS = ['installUri'];

function installUri(uri, contentWin) {
  var win = GM_util.getBrowserWindow();
  if (win && win.GM_BrowserUI) {
    win.GM_BrowserUI.startInstallScript(uri, contentWin);
    return true;
  }
  return false;
}
