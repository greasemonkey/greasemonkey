function ScriptRequire(script) {
  this._script = script;

  this._downloadURL = null; // Only for scripts not installed
  this._tempFile = null; // Only for scripts not installed
  this._filename = null;
  this.type = "require";
  this.updateScript = false;
}

ScriptRequire.prototype

ScriptRequire.prototype.__defineGetter__('file',
function ScriptRequire_getFile() {
  var file = this._script._basedirFile;
  file.append(this._filename);
  return file;
});

ScriptRequire.prototype.__defineGetter__('fileURL',
function ScriptRequire_getFileURL() {
  return GM_getUriFromFile(this.file).spec;
});

ScriptRequire.prototype.__defineGetter__('textContent',
function ScriptRequire_getTextContent() { return GM_getContents(this.file); });

ScriptRequire.prototype.__defineGetter__('urlToDownload',
function ScriptRequire_getUrlToDownload() { return this._downloadURL; });

ScriptRequire.prototype._initFile = function() {
  var name = this._downloadURL.substr(this._downloadURL.lastIndexOf("/") + 1);
  if(name.indexOf("?") > 0) {
    name = name.substr(0, name.indexOf("?"));
  }
  name = this._script._initFileName(name, true);

  var file = this._script._basedirFile;
  file.append(name);
  file.createUnique(
      Components.interfaces.nsIFile.NORMAL_FILE_TYPE, GM_fileMask);
  this._filename = file.leafName;

  GM_log("Moving dependency file from " + this._tempFile.path + " to " + file.path);

  file.remove(true);
  this._tempFile.moveTo(file.parent, file.leafName);
  this._tempFile = null;
};

ScriptRequire.prototype.setDownloadedFile = function(file) {
  this._tempFile = file;
  if (this.updateScript)
    this._initFile();
};
