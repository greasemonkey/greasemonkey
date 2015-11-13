// The "front end" implementation of GM_ScriptStorageFront().  This is loaded into
// the content process scope and simply delegates to the back end..

var Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");

Cu.import("chrome://greasemonkey-modules/content/third-party/getChromeWinForContentWin.js");
Cu.import('chrome://greasemonkey-modules/content/prefmanager.js');
Cu.import("chrome://greasemonkey-modules/content/util.js");


var EXPORTED_SYMBOLS = ['GM_ScriptStorageFront'];

var CACHE_AFTER_N_GETS = 3;

var hitCounter = new Map();
var cache = new Map();

var cpmm = Components.classes["@mozilla.org/childprocessmessagemanager;1"]
  .getService(Components.interfaces.nsISyncMessageSender);

cpmm.addMessageListener("greasemonkey:value-invalidate", function(message) {
  var data = message.data;
  
  data.keys.forEach(invalidateCache)
});


function invalidateCache(key) {
  cache['delete'](key);
  hitCounter['delete'](key);  
}

function cacheKey(script, name) {
  return script.uuid + ":" + name;  
}


// \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ //

function GM_ScriptStorageFront(aScript, aMessageManager, aSandbox) {
  this._db = null;
  this._messageManager = aMessageManager;
  this._sandbox = aSandbox;
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
  
  var key = cacheKey(this._script, name);
  
  invalidateCache(key);

  if ('undefined' == typeof val) val = null;
  this._messageManager.sendSyncMessage(
      'greasemonkey:scriptVal-set',
      {scriptId: this._script.id, name: name, val: val, cacheKey: key});
};


GM_ScriptStorageFront.prototype.getValue = function(name, defVal) {
  
  var value;
  
  var key = cacheKey(this._script, name);
  
  if(cache.has(key)) {
    value = cache.get(key)
  } else {
    var count = (hitCounter.get(key) || 0) + 1;
    var intentToCache = count > CACHE_AFTER_N_GETS;

    value = this._messageManager.sendSyncMessage('greasemonkey:scriptVal-get',
        {
          scriptId: this._script.id,
          cacheKey: key,
          name: name,
          willCache: intentToCache
        });

    value = value.length && value[0];
    
    // avoid caching large values
    if(('string' === typeof value) && value.length > 4096) {
      count = 0;
      intentToCache = false;
    }
    
    try {
      value = JSON.parse(value);
    } catch (e) {
      dump('JSON parse error? ' + uneval(e) + '\n');
      return defVal;
    }
    
    
    
    if(intentToCache) {
      // clean caches if scripts dynamically generate lots of keys
      if(cache.size > 1024) {
        cache.clear();
        hitCounter.clear();
      }
        
      cache.set(key, value);
    }
      
    hitCounter.set(key, count);
    
  }
    

  if ('undefined' == typeof defVal) defVal = undefined;
  if (value === undefined || value === null) return defVal;

  return Components.utils.cloneInto(value, this._sandbox,
      { wrapReflectors: true });

};


GM_ScriptStorageFront.prototype.deleteValue = function(name) {
  var key = cacheKey(this._script, name);
  
  invalidateCache(key);
  
  this._messageManager.sendSyncMessage(
      'greasemonkey:scriptVal-delete',
      {scriptId: this._script.id, name: name, cacheKey: key});
};


GM_ScriptStorageFront.prototype.listValues = function() {
  var value = this._messageManager.sendSyncMessage(
      'greasemonkey:scriptVal-list',
      {scriptId: this._script.id});
  return JSON.stringify(value.length && value[0] || []);
};


GM_ScriptStorageFront.prototype.getStats = function() {
  throw 'Script storage front end does not expose stats.';
};
