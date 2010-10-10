function ScriptIcon(script) {
  ScriptResource.call(this, script);
  this.type = "icon";
  this._dataURI = null;
}

// Inherit from ScriptResource
ScriptIcon.prototype = new ScriptResource();
ScriptIcon.prototype.constructor = ScriptIcon;

ScriptIcon.prototype.hasDownloadURL = function() {
  return !!this._downloadURL;
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

ScriptIcon.prototype.__defineSetter__("fileURL", function(icon) {
  if (/^data:/i.test(icon)) {
    // icon is a data scheme
    this._dataURI = icon;
  } else if (icon) {
    // icon is a file
    this._filename = icon;
  }
});
