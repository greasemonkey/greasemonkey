Components.utils.import('resource://greasemonkey/parseScript.js');
Components.utils.import('resource://greasemonkey/remoteScript.js');
Components.utils.import('resource://greasemonkey/util.js');

const EXPORTED_SYMBOLS = ['installScriptFromSource'];

function installScriptFromSource(aSource, aCallback) {
  var remoteScript = new RemoteScript();
  var script = parse(aSource);
  var tempFileName = cleanFilename(script.name, 'gm_script') + '.user.js';
  var tempFile = GM_util.getTempFile(remoteScript._tempDir, tempFileName);
  GM_util.writeToFile(aSource, tempFile, function() {
    // install this script
    remoteScript.setScript(script, tempFile);
    remoteScript.install();
    // and fire up the editor!
    GM_util.openInEditor(script);
  });
  if (aCallback) aCallback();
}
