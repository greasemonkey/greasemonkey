var EXPORTED_SYMBOLS = ['ScriptResource'];

Components.utils.import('resource://greasemonkey/scriptRequire.js');
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

ScriptResource.prototype.toString = function() {
  return '[ScriptResource; ' + this.filename + ']';
}

ScriptResource.prototype.__defineGetter__('name',
function ScriptResource_getName() { return this._name; });

ScriptResource.prototype.__defineGetter__('file',
function ScriptResource_getFile() {
  var file = this._script._basedirFile;
  file.append(this._filename);
  return file;
});

ScriptResource.prototype.__defineGetter__("filename",
function ScriptResource_getFilename() { return new String(this._filename); });

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

ScriptResource.prototype.__defineGetter__('urlToDownload',
function ScriptResource_getUrlToDownload() { return this._downloadURL; });

ScriptResource.prototype.setFilename = ScriptRequire.prototype.setFilename;

/** This should only be called as part of the download process. */
ScriptResource.prototype.setMimetype = function(aMimetype) {
  this._mimetype = aMimetype;
}

/** This should only be called as part of the download process. */
ScriptResource.prototype.setCharset = function(aCharset) {
  this._charset = aCharset;
}
