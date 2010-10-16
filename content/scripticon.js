function ScriptIcon(script) {
  ScriptResource.call(this, script);
  this.type = "icon";
  this._dataURI = null;
  this.dataUriError = false;
}

// Inherit from ScriptResource
ScriptIcon.prototype = new ScriptResource();
ScriptIcon.prototype.constructor = ScriptIcon;

ScriptIcon.prototype.__defineSetter__("metaVal", function(value) {
  // accept data uri schemes for image mime types
  if (/^data:image\//i.test(value)) {
    this._dataURI = value;
  } else if (/^data:/i.test(value)) {
    this.dataUriError = true;
    throw new Error('@icon data: uri must be an image type');
  } else {
    var resUri = GM_uriFromUrl(this._script._downloadURL);
    this._downloadURL = GM_uriFromUrl(value, resUri).spec;
  }
});

ScriptIcon.prototype.hasDownloadURL = function() {
  return !!this._downloadURL;
};

ScriptIcon.prototype.isImage = function(contentType) {
  return /^image\//i.test(contentType);
};

ScriptIcon.prototype.__defineGetter__("filename", function() {
  return (this._filename || this._dataURI);
});

ScriptIcon.prototype.__defineGetter__("fileURL", function() {
  if (this._dataURI) {
    return this._dataURI;
  } else if (this._filename) { 
    return GM_getUriFromFile(this.file).spec;
  } else {
    return "chrome://greasemonkey/skin/userscript.png";
  }
});

ScriptIcon.prototype.__defineSetter__("fileURL", function(iconURL) {
  if (/^data:/i.test(iconURL)) {
    // icon is a data scheme
    this._dataURI = iconURL;
  } else if (iconURL) {
    // icon is a file
    this._filename = iconURL;
  }
});
