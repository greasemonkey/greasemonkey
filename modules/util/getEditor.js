Components.utils.import('chrome://greasemonkey-modules/content/prefmanager.js');
Components.utils.import('chrome://greasemonkey-modules/content/util.js');

var EXPORTED_SYMBOLS = ['getEditor'];

function getEditor() {
  var editorPath = GM_prefRoot.getValue("editor");
  if (!editorPath) return null;

  var editor = null;
  try {
    editor = Components.classes["@mozilla.org/file/local;1"]
        .createInstance(Components.interfaces.nsIFile);
    editor.followLinks = true;
    editor.initWithPath(editorPath);
  } catch (e) {
    GM_util.logError(e, false, e.fileName, e.lineNumber);
  }

  // make sure the editor preference is still valid
  if (!editor || !editor.exists() || !editor.isExecutable()) {
    GM_prefRoot.remove("editor");
    editor = null;
  }

  return editor;
}
