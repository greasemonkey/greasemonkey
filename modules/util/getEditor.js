Components.utils.import('resource://greasemonkey/prefmanager.js');
Components.utils.import('resource://greasemonkey/util.js');

var EXPORTED_SYMBOLS = ['getEditor'];
var stringBundle = Components
    .classes["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .createBundle("chrome://greasemonkey/locale/gm-browser.properties");
var EDITOR_PROMPT = stringBundle.GetStringFromName("editor.prompt");
var PICK_EXE = stringBundle.GetStringFromName("editor.please_pick_executable");

function getEditor(change) {
  var editorPath = GM_prefRoot.getValue("editor");

  var editor;
  try {
    editor = Components.classes["@mozilla.org/file/local;1"]
        .createInstance(Components.interfaces.nsILocalFile);
    editor.followLinks = true;
    editor.initWithPath(editorPath);
  } catch (e) {
    editor = null;
  }

  if (!change && editorPath) {
    // make sure the editor preference is still valid
    if (editor && editor.exists() && editor.isExecutable()) {
      return editor;
    } else {
      GM_prefRoot.remove("editor");
    }
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

    if (editor) {
      filePicker.defaultString = editor.leafName;
      filePicker.displayDirectory = editor.parent;
    }

    if (filePicker.show() != nsIFilePicker.returnOK) {
      // The user canceled, return null.
      return null;
    }

    if (filePicker.file.exists() && filePicker.file.isExecutable()) {
      GM_prefRoot.setValue("editor", filePicker.file.path);
      return filePicker.file;
    } else {
      GM_util.alert(PICK_EXE);
    }
  }
}
