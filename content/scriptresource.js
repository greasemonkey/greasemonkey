Components.utils.import('resource://greasemonkey/util.js');

function ScriptResource(script) {
  this._script = script || null;

  this._downloadURL = null;
  this._tempFile = null;
  this._filename = null;
  this._mimetype = null;
  this._charset = null;
  this.type = "resource";
  this.updateScript = false;

  this._name = null;
}

ScriptResource.prototype.__defineGetter__('name',
function ScriptResource_getName() { return this._name; });

ScriptResource.prototype.__defineGetter__('file',
function ScriptResource_getFile() {
  var file = this._script._basedirFile;
  file.append(this._filename);
  return file;
});

ScriptResource.prototype.__defineGetter__('textContent',
function ScriptResource_getTextContent() { return GM_util.getContents(this.file); });

ScriptResource.prototype.__defineGetter__('dataContent',
function ScriptResource_getDataContent() {
  var appSvc = Components.classes["@mozilla.org/appshell/appShellService;1"]
      .getService(Components.interfaces.nsIAppShellService);

  var window = appSvc.hiddenDOMWindow;
  var binaryContents = GM_util.getBinaryContents(this.file);

  var mimetype = this._mimetype;
  if (this._charset && this._charset.length > 0) {
    mimetype += ";charset=" + this._charset;
  }

  return "data:" + mimetype
      + ";base64," + window.encodeURIComponent(window.btoa(binaryContents));
});

ScriptResource.prototype._initFile = ScriptRequire.prototype._initFile;

ScriptResource.prototype.__defineGetter__('urlToDownload',
function ScriptResource_getUrlToDownload() { return this._downloadURL; });

ScriptResource.prototype.setDownloadedFile =
function(tempFile, mimetype, charset) {
  this._tempFile = tempFile;
  this._mimetype = mimetype;
  this._charset = charset;
  if (this.updateScript) this._initFile();
};
