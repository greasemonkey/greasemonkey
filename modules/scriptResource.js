var EXPORTED_SYMBOLS = ['ScriptResource'];

Components.utils.import('resource://greasemonkey/scriptDependency.js');
Components.utils.import('resource://greasemonkey/util.js');

ScriptResource.prototype = new ScriptDependency();
ScriptResource.prototype.constructor = ScriptResource;
function ScriptResource(aScript) {
  ScriptDependency.call(this, aScript);
  this.type = 'ScriptResource';
}

ScriptResource.prototype.__defineGetter__('dataContent',
function ScriptResource_getDataContent() {
  var binaryContents = GM_util.getBinaryContents(this.file);

  var mimetype = this._mimetype;
  if (this._charset && this._charset.length > 0) {
    mimetype += ';charset=' + this._charset;
  }

  return 'data:' + mimetype
      + ';base64,' + encodeURIComponent(btoa(binaryContents));
});
