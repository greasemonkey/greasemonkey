var EXPORTED_SYMBOLS = ['ScriptResource'];

Components.utils.import('chrome://greasemonkey-modules/content/scriptDependency.js');
Components.utils.import('chrome://greasemonkey-modules/content/util.js');

ScriptResource.prototype = new ScriptDependency();
ScriptResource.prototype.constructor = ScriptResource;
function ScriptResource(aScript) {
  ScriptDependency.call(this, aScript);
  this.type = 'ScriptResource';
}

ScriptResource.prototype.__defineGetter__('dataContent',
function ScriptResource_getDataContent() {
  var binaryContents = GM_util.getBinaryContents(this.file);

  return 'data:' + this.mimetype
      + ';base64,' + encodeURIComponent(btoa(binaryContents));
});
