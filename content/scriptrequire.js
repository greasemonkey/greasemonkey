function ScriptRequire(script) {
  this._script = script;

  this._downloadURL = null; // Only for scripts not installed
  this._tempFile = null; // Only for scripts not installed
  this._filename = null;
  this.type = "require";
  this.updateScript = false;
}

ScriptRequire.prototype = {
  get file() {
    var file = this._script._basedirFile;
    file.append(this._filename);
    return file;
  },

  get fileURL() { return GM_getUriFromFile(this.file).spec; },
  get textContent() { return GM_getContents(this.file); },

  _initFile: function() {
    var name = this._downloadURL.substr(this._downloadURL.lastIndexOf("/") + 1);
    if(name.indexOf("?") > 0) {
      name = name.substr(0, name.indexOf("?"));
    }
    name = this._script._initFileName(name, true);

    var file = this._script._basedirFile;
    file.append(name);
    file.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0644);
    this._filename = file.leafName;

    GM_log("Moving dependency file from " + this._tempFile.path + " to " + file.path);

    file.remove(true);
    this._tempFile.moveTo(file.parent, file.leafName);
    this._tempFile = null;
  },

  get urlToDownload() { return this._downloadURL; },
  setDownloadedFile: function(file) {
    this._tempFile = file;
    if (this.updateScript)
      this._initFile();
  }
};