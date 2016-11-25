Components.utils.import('chrome://greasemonkey-modules/content/prefmanager.js');
Components.utils.import('chrome://greasemonkey-modules/content/util.js');
Components.utils.import("resource://gre/modules/Services.jsm");

var EXPORTED_SYMBOLS = ['setEditor'];

var stringBundle = Components
    .classes["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .createBundle("chrome://greasemonkey/locale/gm-browser.properties");
var EDITOR_PROMPT = stringBundle.GetStringFromName("editor.prompt");
var PICK_EXE = stringBundle.GetStringFromName("editor.please_pick_executable");

function setEditor(aScratchpad) {
  if (aScratchpad) {
    GM_prefRoot.remove("editor");
    return true;
  }

  // Ask the user to choose a new editor. Sometimes users get confused and
  // pick a non-executable file, so we set this up in a loop so that if they do
  // that we can give them an error and try again.
  while (true) {
    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var filePicker = Components.classes["@mozilla.org/filepicker;1"]
        .createInstance(nsIFilePicker);

    filePicker.init(
        GM_util.getBrowserWindow(), EDITOR_PROMPT, nsIFilePicker.modeOpen);
    filePicker.appendFilters(nsIFilePicker.filterApps);
    if (Services.appShell.hiddenDOMWindow.navigator.platform
        .indexOf("Win") != -1) {
      filePicker.appendFilter("*.cmd", "*.cmd");
    }
    
    var editor = GM_util.getEditor();
    if (editor) {
      filePicker.defaultString = editor.leafName;
      filePicker.displayDirectory = editor.parent;
    }

    if (filePicker.show() != nsIFilePicker.returnOK) {
      // The user canceled, return false.
      return false;
    }

    if (filePicker.file.exists() && filePicker.file.isExecutable()) {
      GM_prefRoot.setValue("editor", filePicker.file.path);
      return true;
    } else {
      GM_util.alert(PICK_EXE);
      return false;
    }
  }
}
