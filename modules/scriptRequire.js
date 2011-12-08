var EXPORTED_SYMBOLS = ['ScriptRequire'];

Components.utils.import('resource://greasemonkey/constants.js');
Components.utils.import('resource://greasemonkey/util.js');

function ScriptRequire(script) {
  this._script = script;

  this._downloadURL = null;
  this._filename = null;
  this.type = "require";
  this.updateScript = false;
}

ScriptRequire.prototype.__defineGetter__('file',
function ScriptRequire_getFile() {
  var file = this._script._basedirFile;
  file.append(this._filename);
  return file;
});

ScriptRequire.prototype.__defineGetter__("filename",
function ScriptRequire_getFilename() { return new String(this._filename); });

ScriptRequire.prototype.__defineGetter__('fileURL',
function ScriptRequire_getFileURL() {
  return GM_util.getUriFromFile(this.file).spec;
});

ScriptRequire.prototype.__defineGetter__('textContent',
function ScriptRequire_getTextContent() { return GM_util.getContents(this.file); });

ScriptRequire.prototype.__defineGetter__('urlToDownload',
function ScriptRequire_getUrlToDownload() { return this._downloadURL; });

ScriptRequire.prototype.setFilename = function(aFile) {
  aFile.QueryInterface(Components.interfaces.nsILocalFile);
  this._filename = aFile.leafName;
};
