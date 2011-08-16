var EXPORTED_SYMBOLS = ["GM_notification"];

var Cc = Components.classes;
var Ci = Components.interfaces;

// The first time this runs, we check if nsIAlertsService is installed and
// works. If it fails, we re-define notify to use a chrome window.
// We check to see if nsIAlertsService works because of the case where Growl
// is not installed. See also https://bugzilla.mozilla.org/show_bug.cgi?id=597165
function notify() {
  try {
    Cc["@mozilla.org/alerts-service;1"]
        .getService(Ci.nsIAlertsService)
        .showAlertNotification.apply(null, arguments);
  } catch (e) {
    notify = function() {
      Cc['@mozilla.org/embedcomp/window-watcher;1']
          .getService(Ci.nsIWindowWatcher)
          .openWindow(null, 'chrome://global/content/alerts/alert.xul',
              '_blank', 'chrome,titlebar=no,popup=yes', null)
          .arguments = arguments;
    };
    notify.apply(null, arguments);
  }
}

function GM_notification(aMsg, aTitle) {
  var title = aTitle ? "" + aTitle : "Greasemonkey";
  var message = aMsg ? "" + aMsg : "";
  notify(
      "chrome://greasemonkey/skin/icon32.png",
      title, message, false, "", null);
};
