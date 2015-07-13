var EXPORTED_SYMBOLS = ['getBrowserWindow'];

var windowMediator = Components
   .classes['@mozilla.org/appshell/window-mediator;1']
   .getService(Components.interfaces.nsIWindowMediator);

function getBrowserWindow() {
  return windowMediator.getMostRecentWindow("navigator:browser");
}
