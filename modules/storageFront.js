// The "front end" implementation of GM_ScriptStorageFront().  This is loaded into
// the content process scope and simply delegates to the back end..

var Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");

Cu.import("resource://greasemonkey/third-party/getChromeWinForContentWin.js");
Cu.import('resource://greasemonkey/prefmanager.js');
Cu.import("resource://greasemonkey/util.js");


var EXPORTED_SYMBOLS = ['GM_ScriptStorageFront'];

// \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ //

function GM_ScriptStorageFront(aScript, aMessageManager) {
  this._db = null;
  this._messageManager = aMessageManager;
  this._script = aScript;
  this.stringBundle = Components
    .classes["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .createBundle("chrome://greasemonkey/locale/greasemonkey.properties");
}


GM_ScriptStorageFront.prototype.__defineGetter__('dbFile',
function GM_ScriptStorageFront_getDbFile() {
  throw 'Script storage front end has no DB file.';
});


GM_ScriptStorageFront.prototype.__defineGetter__('db',
function GM_ScriptStorageFront_getDb() {
  throw 'Script storage front end has no DB connection.';
});


GM_ScriptStorageFront.prototype.close = function() {
  throw 'Script storage front end has no DB connection.';
};


GM_ScriptStorageFront.prototype.setValue = function(name, val) {
  if (2 !== arguments.length) {
    throw new Error(this.stringBundle.GetStringFromName('error.args.setValue'));
  }

  this._messageManager.sendSyncMessage(
      'greasemonkey:scriptVal-set',
      {scriptId: this._script.id, name: name, val: val});
};


GM_ScriptStorageFront.prototype.getValue = function(name, defVal) {
  var value = this._messageManager.sendSyncMessage(
      'greasemonkey:scriptVal-get',
      {scriptId: this._script.id, name: name});
  value = value.length && value[0];

  if (value === undefined || value === null) return defVal;

  try {
    return JSON.parse(value);
  } catch (e) {
    dump('JSON parse error? ' + uneval(e) + '\n');
    return defVal;
  }
};


GM_ScriptStorageFront.prototype.deleteValue = function(name) {
  this._messageManager.sendSyncMessage(
      'greasemonkey:scriptVal-delete',
      {scriptId: this._script.id, name: name});
};


GM_ScriptStorageFront.prototype.listValues = function() {
  var value = this._messageManager.sendSyncMessage(
      'greasemonkey:scriptVal-list',
      {scriptId: this._script.id});
  value = value.length && value[0] || [];
  // See #1637.
  var vals = Array.prototype.slice.call(value);
  vals.__exposedProps__ = {'length': 'r'};
  return vals;
};


GM_ScriptStorageFront.prototype.getStats = function() {
  throw 'Script storage front end does not expose stats.';
};
