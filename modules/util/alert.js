Components.utils.import('resource://greasemonkey/prefmanager.js');
Components.utils.import('resource://greasemonkey/util.js');

const EXPORTED_SYMBOLS = ['alert'];
const promptService = Components
    .classes["@mozilla.org/embedcomp/prompt-service;1"]
    .getService(Components.interfaces.nsIPromptService);

// Because alert is not defined in component/module scope.
function alert(msg) {
  promptService.alert(null, "Greasemonkey alert", msg);
}
