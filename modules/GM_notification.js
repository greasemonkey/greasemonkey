// JSM exported symbols
var EXPORTED_SYMBOLS = ["GM_notification"];

const alertsServ = Components.classes["@mozilla.org/alerts-service;1"]
    .getService(Components.interfaces.nsIAlertsService);

function GM_notification(aMsg, aTitle) {
  var title = aTitle ? "" + aTitle : "Greasemonkey";
  var message = aMsg ? "" + aMsg : "";
  try {
    alertsServ.showAlertNotification(
        "chrome://greasemonkey/skin/icon_medium.png",
        title, message, false, "", null);
  } catch (e) {
    // In case e.g. Growl is not installed on a Mac.
    alert(title + "\n" + message);
  }
};
