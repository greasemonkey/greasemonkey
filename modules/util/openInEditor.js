Components.utils.import('resource://greasemonkey/prefmanager.js');
Components.utils.import('resource://greasemonkey/util.js');

const EXPORTED_SYMBOLS = ['openInEditor'];

const COULD_NOT_LAUNCH = (function() {
  var stringBundle = Components
      .classes["@mozilla.org/intl/stringbundle;1"]
      .getService(Components.interfaces.nsIStringBundleService)
      .createBundle("chrome://greasemonkey/locale/gm-browser.properties");
  return stringBundle.GetStringFromName("editor.could_not_launch");
})();

function openInEditor(script) {
  var editor = GM_util.getEditor();
  if (!editor) {
    // The user did not choose an editor.
    return;
  }

  try {
    var args=[script.file.path];

    // For the mac, wrap with a call to "open".
    var xulRuntime = Components.classes["@mozilla.org/xre/app-info;1"]
        .getService(Components.interfaces.nsIXULRuntime);
    if ("Darwin"==xulRuntime.OS) {
      args = ["-a", editor.path, script.file.path];
      editor = Components.classes["@mozilla.org/file/local;1"]
          .createInstance(Components.interfaces.nsILocalFile);
      editor.followLinks = true;
      editor.initWithPath("/usr/bin/open");
    }

    var process = Components.classes["@mozilla.org/process/util;1"]
        .createInstance(Components.interfaces.nsIProcess);
    process.init(editor);
    if (process.runw) {
      // Firefox 4+; see #1173.
      process.runw(false, args, args.length);
    } else {
      process.run(false, args, args.length);
    }
  } catch (e) {
    // Something may be wrong with the editor the user selected. Remove so that
    // next time they can pick a different one.
    GM_util.alert(COULD_NOT_LAUNCH + "\n" + e);
    GM_prefRoot.remove("editor");
    throw(e);
  }
}
