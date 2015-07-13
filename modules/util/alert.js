Components.utils.import('chrome://greasemonkey-modules/content/util.js');

var EXPORTED_SYMBOLS = ['alert'];
var promptService = Components
    .classes["@mozilla.org/embedcomp/prompt-service;1"]
    .getService(Components.interfaces.nsIPromptService);

// Because alert is not defined in component/module scope.
function alert(msg) {
  promptService.alert(null, "Greasemonkey alert", msg);
}
