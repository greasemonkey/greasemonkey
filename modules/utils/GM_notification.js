
// JSM exported symbols
var EXPORTED_SYMBOLS = ["GM_notification"];

const alertsServ = Components.classes["@mozilla.org/alerts-service;1"]
    .getService(Components.interfaces.nsIAlertsService);

function GM_notification(aMsg, aTitle) {
  alertsServ.showAlertNotification(
    "chrome://greasemonkey/skin/icon_medium.png",
    aTitle || "Greasemonkey",
    aMsg+"",
    false,
    "",
    null);
};
