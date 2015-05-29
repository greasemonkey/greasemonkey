var EXPORTED_SYMBOLS = ['ScriptRequire'];

Components.utils.import('chrome://greasemonkey-modules/content/scriptDependency.js');
Components.utils.import('chrome://greasemonkey-modules/content/util.js');

ScriptRequire.prototype = new ScriptDependency();
ScriptRequire.prototype.constructor = ScriptRequire;
function ScriptRequire(aScript) {
  ScriptDependency.call(this, aScript);
  this.type = "ScriptRequire";
}

ScriptRequire.prototype.__defineGetter__('fileURL',
function ScriptRequire_getFileURL() {
  return GM_util.getUriFromFile(this.file).spec;
});
