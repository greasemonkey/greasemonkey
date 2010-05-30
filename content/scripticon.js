function ScriptIcon(script) {
  this._script = script;

  this._downloadURL = null; // Only for scripts not installed
  this._tempFile = null; // Only for scripts not installed
  this._filename = null;
  this._dataURI = null;
  this._mimetype = null;
  this.type = "icon";
  this.updateScript = false;
}

ScriptIcon.prototype = {
  get _file() {
    var file = this._script._basedirFile;
    file.append(this._filename);
    return file;
  },

  hasDownloadURL: function() {
    if (this._downloadURL) return true;

    return false;
  },

  get filename() {
    return (this._filename || this._dataURI);
  },

  get fileURL() {
    if (this._dataURI) return this._dataURI;

    if (this._filename) return GM_getUriFromFile(this._file).spec;

    return "chrome://greasemonkey/skin/userscript.png";
  },
  set fileURL(icon) {
    if (/^data:/i.test(icon)) {
      // icon is a data scheme
      this._dataURI = icon;
    } else if (icon) {
      // icon is a file
      this._filename = icon;
    }
  },

  _initFile: ScriptRequire.prototype._initFile,

  get urlToDownload() { return this._downloadURL; },
  setDownloadedFile: function(tempFile, mimetype) {
    this._tempFile = tempFile;
    this._mimetype = mimetype;
    if (this.updateScript)
      this._initFile();
  }
};
