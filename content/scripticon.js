function ScriptIcon(script) {
  ScriptResource.call(this, script);
  this._type = "icon";
}

// Inherit from ScriptResource
ScriptIcon.prototype = new ScriptResource();
ScriptIcon.prototype.constructor = ScriptIcon;

ScriptIcon.prototype.__defineGetter__("hasDownloadURL", function() {
  if (this._downloadURL) return true;
  else return false;
}); 

ScriptIcon.prototype.__defineGetter__("filename", function() {
  return (this._filename || this._dataURI);
});

ScriptIcon.prototype.__defineGetter__("fileURL", function() {
  if (this._dataURI) return this._dataURI;
  else if (this._filename) return GM_getUriFromFile(this._file).spec;
  else return "chrome://greasemonkey/skin/userscript.png";
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
