var EXPORTED_SYMBOLS = [];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

(function initSync() {


Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://services-crypto/utils.js');
Cu.import("chrome://greasemonkey-modules/content/miscapis.js");
Cu.import('chrome://greasemonkey-modules/content/prefmanager.js');
Cu.import("chrome://greasemonkey-modules/content/storageBack.js");
Cu.import('chrome://greasemonkey-modules/content/util.js');


var gSyncInitialized = false;

try {
  // The files we're trying to import below don't exist in Firefox builds
  // without sync service, causing the import to throw.
  var gWeave = {};
  Cu.import('resource://services-sync/engines.js', gWeave);
  Cu.import('resource://services-sync/record.js', gWeave);
  Cu.import('resource://services-sync/status.js', gWeave);
  Cu.import('resource://services-sync/util.js', gWeave);
} catch (e) {
  // If there's no sync service, it doesn't make sense to continue.
  return;
}

var SyncServiceObserver = {
  init: function() {
    if (gWeave.Status.ready) {
      this.initEngine();
    } else {
      Services.obs.addObserver(this, 'weave:service:ready', true);
    }
  },

  initEngine: function() {
    if (gSyncInitialized) return;
    gSyncInitialized = true;

    // This must be delayed until after the Greasemonkey service is set up.
    Cu.import('chrome://greasemonkey-modules/content/remoteScript.js');
    // Also delay importing the actual Sync service to prevent conflicts with
    // the master password dialog during browser startup. See #1852.
    Cu.import('resource://services-sync/service.js', gWeave);

    gWeave.Service.engineManager.register(ScriptEngine);
  },

  observe: function(aSubject, aTopic, aData) {
    switch (aTopic) {
    case 'weave:service:ready':
      this.initEngine();
      break;
    }
  },

  QueryInterface: XPCOMUtils.generateQI(
      [Ci.nsIObserver, Ci.nsISupportsWeakReference]),
};


function ScriptRecord(aCollection, aId) {
  gWeave.CryptoWrapper.call(this, aCollection, aId);
}
ScriptRecord.prototype = {
  __proto__: gWeave.CryptoWrapper.prototype,
  _logName: 'Record.GreasemonkeyScript',
};
gWeave.Utils.deferGetSet(
    ScriptRecord, 'cleartext',
    ['downloadURL', 'enabled', 'installed',
     'userExcludes', 'userMatches', 'userIncludes',
     'values', 'valuesTooBig',
    ]);


function ScriptStore(aName, aEngine) {
  gWeave.Store.call(this, aName, aEngine);
}
ScriptStore.prototype = {
  __proto__: gWeave.Store.prototype,

  changeItemID: function(aOldId, aNewId) {
    dump('>>> ScriptStore.changeItemID() ... '
        + aOldId.substr(0, 8) + ' ' + aNewId.substr(0, 8) + '\n');
  },

  /// Incoming Sync record, create local version.
  create: function(aRecord) {
    if (aRecord.cleartext.installed) {
      var url = aRecord.cleartext.downloadURL;
      if (!url) {
        dump('Ignoring incoming sync record with empty downloadURL!\n');
        return;
      }
      if (!GM_util.uriFromUrl(url)) {
        dump('Ignoring incoming sync record with bad downloadURL:\n'
            + url + '\n');
        return;
      }

      var rs = new RemoteScript(aRecord.cleartext.downloadURL);
      rs.setSilent();
      rs.download(GM_util.hitch(this, function(aSuccess, aType) {
        if (aSuccess && 'dependencies' == aType) {
          rs.install();
          rs.script.enabled = aRecord.cleartext.enabled;
          rs.script.userExcludes = aRecord.cleartext.userExcludes;
          rs.script.userMatches = aRecord.cleartext.userMatches;
          rs.script.userIncludes = aRecord.cleartext.userIncludes;
          setScriptValuesFromSyncRecord(rs.script, aRecord);
        }
      }));
    } else {
      var script = scriptForSyncId(aRecord.cleartext.id);
      if (!script) return;
      script.uninstall();
    }
  },

  /// New local item, create sync record.
  createRecord: function(aId, aCollection) {
    var script = scriptForSyncId(aId);
    if (script) {
      var record = new ScriptRecord();
      record.cleartext.id = aId;
      record.cleartext.downloadURL = script.downloadURL;
      record.cleartext.enabled = script.enabled;
      record.cleartext.installed = !script.needsUninstall;
      record.cleartext.userExcludes = script.userExcludes;
      record.cleartext.userMatches = script.userMatches;
      record.cleartext.userIncludes = script.userIncludes;

      if (GM_prefRoot.getValue('sync.values')) {
        var storage = new GM_ScriptStorageBack(script);
        var totalSize = 0;
        var maxSize = GM_prefRoot.getValue('sync.values_max_size_per_script');
        record.cleartext.values = {};
        record.cleartext.valuesTooBig = false;
        var names = storage.listValues();
        for (var i = 0, name = null; name = names[i]; i++) {
          var val = storage.getValue(name);
          try {
            val = JSON.parse(val);
          } catch (e) {
            dump('JSON parse error? ' + uneval(e) + '\n');
            continue;
          }
          record.cleartext.values[name] = val;
          totalSize += name.length;
          totalSize += val.length || 4;  // 4 for number / bool (no length).

          if (totalSize > maxSize) {
            record.cleartext.values = [];
            record.cleartext.valuesTooBig = true;
            break;
          }
        }
      }

      return record;
    } else {
      // Assume this is an uninstalled script.
      var record = new ScriptRecord();
      record.cleartext.enabled = false;
      record.cleartext.installed = false;
      return record;
    }
  },

  getAllIDs: function() {
    var syncIds = {};
    var scripts = GM_util.getService().config.scripts;
    for (var i = 0, script = null; script = scripts[i]; i++) {
      if (!script.downloadURL) continue;
      if (script.downloadURL.match(/^file:/)) continue;
      syncIds[syncId(script)] = 1;
    }
    return syncIds;
  },

  isAddonSyncable: function(aAddon) {
    return true;
  },

  itemExists: function(aId) {
    var script = scriptForSyncId(aId);
    return !!script;
  },

  remove: function(aRecord) {
    var script = scriptForSyncId(aRecord.cleartext.id);
    if (script) script.uninstall();
  },

  update: function(aRecord) {
    var script = scriptForSyncId(aRecord.cleartext.id);
    if (!script) {
      dump('Could not find script for record ' + aRecord.cleartext + '\n');
      return;
    }
    if (!aRecord.cleartext.installed) {
      script.uninstall();
    } else {
      script.enabled = !!aRecord.cleartext.enabled;
      script.userExcludes = aRecord.cleartext.userExcludes || [];
      script.userMatches = aRecord.cleartext.userMatches || [];
      script.userIncludes = aRecord.cleartext.userIncludes || [];
      setScriptValuesFromSyncRecord(script, aRecord);
    }
  },

  wipe: function() {
    dump('>>> ScriptStore.wipe() ...\n');
    // Delete everything!
  },
};


function ScriptTracker(aName, aEngine) {
  gWeave.Tracker.call(this, aName, aEngine);
  GM_util.getService().config.addObserver(this);
}
ScriptTracker.prototype = {
  __proto__: gWeave.Tracker.prototype,

  notifyEvent: function(aScript, aEvent, aData) {
    if (aEvent in {'install': 1, 'modified': 1, 'edit-enabled': 1}) {
      if (this.addChangedID(syncId(aScript))) {
        this.score = Math.min(100, this.score + 5);
      }
    } else if (aEvent in {'cludes': 1, 'val-set': 1, 'val-del': 1}) {
      if (this.addChangedID(syncId(aScript))) {
        this.score = Math.min(100, this.score + 1);
      }
    }
  }
};


function ScriptEngine() {
  gWeave.SyncEngine.call(this, 'Greasemonkey', gWeave.Service);

  this.enabled = GM_prefRoot.getValue('sync.enabled');
  GM_prefRoot.watch('sync.enabled', GM_util.hitch(this, function() {
    this.enabled = GM_prefRoot.getValue('sync.enabled');
  }));
}
ScriptEngine.prototype = {
  __proto__: gWeave.SyncEngine.prototype,
  _recordObj: ScriptRecord,
  _storeObj: ScriptStore,
  _trackerObj: ScriptTracker,
};


function scriptForSyncId(aSyncId) {
  var scripts = GM_util.getService().config.scripts;
  for (var i = 0, script = null; script = scripts[i]; i++) {
    if (syncId(script) == aSyncId) {
      return script;
    }
  }
}


// The sync ID for a given script.
function syncId(aScript) {
  // TODO: Salting?  e.g. btoa(CryptoUtils.generateRandomBytes(16));
  return GM_util.sha1(aScript.id);
}


function setScriptValuesFromSyncRecord(aScript, aRecord) {
  if (GM_prefRoot.getValue('sync.values')
      && !aRecord.cleartext.valuesTooBig
  ) {
    // TODO: Clear any locally set values not in the sync record?
    var storage = new GM_ScriptStorageBack(aScript);
    for (name in aRecord.cleartext.values) {
      storage.setValue(name, aRecord.cleartext.values[name]);
    }
  }
}


SyncServiceObserver.init();
})();
