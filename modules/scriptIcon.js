var EXPORTED_SYMBOLS = ['ScriptIcon'];

Components.utils.import('resource://greasemonkey/scriptDependency.js');
Components.utils.import('resource://greasemonkey/util.js');

ScriptIcon.prototype = new ScriptDependency();
ScriptIcon.prototype.constructor = ScriptIcon;
function ScriptIcon(aScript) {
  ScriptDependency.call(this, aScript);
  this.type = 'ScriptIcon';
}

ScriptIcon.prototype.__defineGetter__('fileURL',
function ScriptIcon_getFileURL() {
  if (this._dataURI) {
    return this._dataURI;
  } else if (this._filename) {
    return GM_util.getUriFromFile(this.file).spec;
  } else {
    return 'chrome://greasemonkey/skin/userscript.png';
  }
});

ScriptIcon.prototype.__defineSetter__('fileURL',
function ScriptIcon_setFileURL(iconURL) {
  if (/^data:/i.test(iconURL)) {
    // icon is a data scheme
    this._dataURI = iconURL;
  } else if (iconURL) {
    // icon is a file
    this._filename = iconURL;
  }
});

ScriptIcon.prototype.setMetaVal = function(value) {
  // accept data uri schemes for image mime types
  if (/^data:image\//i.test(value)) {
    this._dataURI = value;
  } else if (/^data:/i.test(value)) {
    throw new Error('@icon data: uri must be an image type');
  } else {
    var resUri = GM_util.uriFromUrl(this._script._downloadURL);
    this._downloadURL = GM_util.uriFromUrl(value, resUri).spec;
  }
};
