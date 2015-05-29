Components.utils.import("resource://gre/modules/PopupNotifications.jsm");
Components.utils.import("chrome://greasemonkey-modules/content/prefmanager.js");
Components.utils.import('chrome://greasemonkey-modules/content/util.js');

var EXPORTED_SYMBOLS = ["GM_notification"];

var Cc = Components.classes;
var Ci = Components.interfaces;

var gStringBundle = Components
    .classes["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .createBundle("chrome://greasemonkey/locale/greasemonkey.properties");

function mute(aTopic) {
  GM_prefRoot.setValue('notification.muted.' + aTopic, true);
}

function GM_notification(
    aMsg, aTopic) {
  var muted = GM_prefRoot.getValue('notification.muted.' + aTopic, false);
  if (muted) return;

  var action = {
      'label': gStringBundle.GetStringFromName('notification.ok.label'),
      'accessKey': gStringBundle.GetStringFromName('notification.ok.accesskey'),
      'callback': function() { },
      }
  var muteAction = {
      'label': gStringBundle.GetStringFromName('notification.neveragain.label'),
      'accessKey': gStringBundle.GetStringFromName('notification.neveragain.accesskey'),
      'callback': function() { mute(aTopic); },
      };
  var win = GM_util.getBrowserWindow();
  win.PopupNotifications.show(
      win.gBrowser.selectedBrowser, 'greasemonkey-notification',
      aMsg, null, action, [muteAction]);
};
