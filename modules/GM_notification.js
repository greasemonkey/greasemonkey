var EXPORTED_SYMBOLS = ["GM_notification"];

const {classes: Cc, interfaces: Ci} = Components;

try {
  var notify = Cc["@mozilla.org/alerts-service;1"]
      .getService(Ci.nsIAlertsService)
      .showAlertNotification;
} catch (e) {
  var notify = function() {
    Cc["@mozilla.org/embedcomp/prompt-service;1"]
        .getService(Ci.nsIPromptService)
        .alert(null, "Greasemonkey alert", arguments[2]);
  }
}

function GM_notification(aMsg, aTitle) {
  var title = aTitle ? "" + aTitle : "Greasemonkey";
  var message = aMsg ? "" + aMsg : "";
  notify(
      "chrome://greasemonkey/skin/icon_medium.png",
      title, message, false, "", null);
};
