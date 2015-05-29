Components.utils.import('chrome://greasemonkey-modules/content/GM_notification.js');
Components.utils.import('chrome://greasemonkey-modules/content/parseScript.js');
Components.utils.import('chrome://greasemonkey-modules/content/remoteScript.js');
Components.utils.import('chrome://greasemonkey-modules/content/util.js');

var EXPORTED_SYMBOLS = ['installScriptFromSource'];

var gCouldNotDownloadString = Components
    .classes["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .createBundle("chrome://greasemonkey/locale/greasemonkey.properties")
    .GetStringFromName('error.could-not-download-dependencies');

function installScriptFromSource(aSource, aCallback) {
  var remoteScript = new RemoteScript();
  var script = parse(aSource);
  var tempFileName = cleanFilename(script.name, 'gm_script') + '.user.js';
  var tempFile = GM_util.getTempFile(remoteScript._tempDir, tempFileName);
  GM_util.writeToFile(aSource, tempFile, function() {
    remoteScript.setScript(script, tempFile);
    remoteScript.download(function(aSuccess) {
      if (!aSuccess) {
        GM_notification(
            gCouldNotDownloadString.replace('%1', remoteScript.errorMessage),
            'dependency-download-failed');
        return;
      }
      remoteScript.install();
      GM_util.openInEditor(script);
      if (aCallback) aCallback();
    });
  });
}
