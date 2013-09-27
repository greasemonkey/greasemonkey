var EXPORTED_SYMBOLS = [];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;


Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://services-crypto/utils.js');
Cu.import('resource://greasemonkey/prefmanager.js');
Cu.import('resource://greasemonkey/util.js');


var gSyncInitialized = false;

var gWeave = {};
Cu.import('resource://services-sync/engines.js', gWeave);
Cu.import('resource://services-sync/record.js', gWeave);
Cu.import('resource://services-sync/service.js', gWeave);
Cu.import('resource://services-sync/status.js', gWeave);
Cu.import('resource://services-sync/util.js', gWeave);


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
    Cu.import('resource://greasemonkey/remoteScript.js');

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
    ['downloadURL', 'enabled', 'installed']);


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
  create: function(record) {
    if (record.cleartext.installed) {
      var rs = new RemoteScript(record.cleartext.downloadURL);
      rs.setSilent();
      rs.download(GM_util.hitch(this, function(aSuccess, aType) {
        if (aSuccess && 'dependencies' == aType) {
          rs.install();
          rs.script.enabled = record.enabled;
        }
      }));
    } else {
      var script = scriptForSyncId(record.cleartext.id);
      if (!script) return;
      script.uninstall();
    }
  },

  /// New local item, create sync record.
  createRecord: function(aId, aCollection) {
    var script = scriptForSyncId(aId);
    if (script) {
      var record = new ScriptRecord();
      record.cleartext.downloadURL = script.downloadURL;
      record.cleartext.enabled = script.enabled;
      record.cleartext.installed = !script.needsUninstall;
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
      syncIds[syncId(script)] = 1;
    }
    return syncIds;
  },

  itemExists: function(aId) {
    var script = scriptForSyncId(aId);
    return !!script;
  },

  remove: function(record) {
    var script = scriptForSyncId(record.cleartext.id);
    if (script) script.uninstall();
  },

  update: function(record) {
    var script = scriptForSyncId(record.cleartext.id);
    if (!script) {
      dump('Could not find script for record ' + record.cleartext + '\n');
      return;
    }
    if (!record.cleartext.installed) {
      script.uninstall();
    } else {
      script.enabled = record.cleartext.enabled;
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

  notifyEvent: function observer_notifyEvent(aScript, aEvent, aData) {
    var events = {'install': 1, 'modified': 1, 'edit-enabled': 1};
    if (aEvent in events) {
      if (this.addChangedID(syncId(aScript))) {
        this.score = Math.min(100, this.score + 5);
      }
    }
   }
};


function ScriptEngine() {
  gWeave.SyncEngine.call(this, 'Greasemonkey', gWeave.Service);

  this.enabled = GM_prefRoot.getValue('sync.enabled');
  GM_prefRoot.watch('sync.enabled', GM_util.hitch(this, function() {
    dump('ScriptEngine observed sync enable change.\n');
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


SyncServiceObserver.init()
