// Examines the stack to determine if an API should be callable.

const EXPORTED_SYMBOLS = ['apiLeakCheck'];

Components.utils.import('resource://greasemonkey/prefmanager.js');
Components.utils.import('resource://greasemonkey/util.js');

var gAccessViolationString = Components
    .classes["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .createBundle("chrome://greasemonkey/locale/greasemonkey.properties")
    .GetStringFromName('error.access-violation');
var gComponentPath = GM_util.getService().filename;
var gScriptDirPath = (function() {
  var ios = Components.classes["@mozilla.org/network/io-service;1"]
      .getService(Components.interfaces.nsIIOService);
  var scriptDir = GM_util.scriptDir();
  return ios.newFileURI(scriptDir).spec;
})();


function apiLeakCheck(apiName, origArguments) {
  var argLen = origArguments.length;
  for (var i = 0; i < argLen; i++) {
    var arg = origArguments[i];
    if (arg && arg.wrappedJSObject) {
      GM_util.logError(new Error(
          gAccessViolationString.replace('%1', apiName) + ' (Xray)'
          ));
      return false;
    }
  }

  var stack = Components.stack;
  do {
    // Valid locations for GM API calls are:
    //  * Greasemonkey scripts.
    //  * Greasemonkey extension by path.
    //  * Greasemonkey modules.
    //  * All of chrome.  (In the script update case, chrome will list values.
    //        Including Sync modules.)
    // Anything else on the stack and we will reject the API, to make sure that
    // the content window (whose path would be e.g. http://...) has no access.
    if (2 == stack.language
        && stack.filename !== gComponentPath
        && stack.filename.substr(0, gScriptDirPath.length) !== gScriptDirPath
        && stack.filename.substr(0, 24) !== 'resource://greasemonkey/'
        && stack.filename.substr(0, 25) !== 'resource://services-sync/'
        && stack.filename.substr(0, 15) !== 'resource://gre/'
        && stack.filename.substr(0, 9) !== 'chrome://'
        ) {
      GM_util.logError(new Error(
          gAccessViolationString.replace('%1', apiName)
          ));
      return false;
    }

    stack = stack.caller;
  } while (stack);

  return true;
}
