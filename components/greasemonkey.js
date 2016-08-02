///////////////////////// Component-global "Constants" /////////////////////////

var DESCRIPTION = "GM_GreasemonkeyService";
var CONTRACTID = "@greasemonkey.mozdev.org/greasemonkey-service;1";
var CLASSID = Components.ID("{77bf3650-1cd6-11da-8cd6-0800200c9a66}");
var GM_GUID = "{e4a8a97b-f2ed-450b-b12d-ee082ba24781}";


var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/AddonManager.jsm");

Cu.import("chrome://greasemonkey-modules/content/ipcscript.js");
Cu.import("chrome://greasemonkey-modules/content/menucommand.js");
Cu.import("chrome://greasemonkey-modules/content/prefmanager.js");
Cu.import("chrome://greasemonkey-modules/content/storageBack.js");
Cu.import("chrome://greasemonkey-modules/content/sync.js");
Cu.import("chrome://greasemonkey-modules/content/util.js");


var gFileProtocolHandler = Components
    .classes["@mozilla.org/network/protocol;1?name=file"]
    .getService(Ci.nsIFileProtocolHandler);
var gGreasemonkeyVersion = 'unknown';
var gStartupHasRun = false;
var gTmpDir = Components.classes["@mozilla.org/file/directory_service;1"]
    .getService(Components.interfaces.nsIProperties)
    .get("TmpD", Components.interfaces.nsIFile);

/////////////////////// Component-global Helper Functions //////////////////////

function shutdown(aService) {
  aService.closeAllScriptValStores();
}

function startup(aService) {
  if (gStartupHasRun) return;
  gStartupHasRun = true;

  var loader = Cc["@mozilla.org/moz/jssubscript-loader;1"]
      .getService(Ci.mozIJSSubScriptLoader);
  loader.loadSubScript("chrome://global/content/XPCNativeWrapper.js");
  loader.loadSubScript("chrome://greasemonkey/content/config.js");
  loader.loadSubScript("chrome://greasemonkey/content/third-party/mpl-utils.js");

  // Most incoming messages go to the "global" message manager.
  var globalMessageManager = Cc["@mozilla.org/globalmessagemanager;1"]
      .getService(Ci.nsIMessageListenerManager);

  var scriptValHandler = aService.handleScriptValMsg.bind(aService);
  globalMessageManager.addMessageListener(
      'greasemonkey:scriptVal-delete', scriptValHandler);
  globalMessageManager.addMessageListener(
      'greasemonkey:scriptVal-get', scriptValHandler);
  globalMessageManager.addMessageListener(
      'greasemonkey:scriptVal-list', scriptValHandler);
  globalMessageManager.addMessageListener(
      'greasemonkey:scriptVal-set', scriptValHandler);

  // Others go to the "parent" message manager.
  var parentMessageManager = Cc["@mozilla.org/parentprocessmessagemanager;1"]
      .getService(Ci.nsIMessageListenerManager);

  parentMessageManager.addMessageListener(
      'greasemonkey:scripts-update', function(message) {
        return aService.scriptUpdateData();
      });
  parentMessageManager.addMessageListener(
      'greasemonkey:broadcast-script-updates', function (message) {
        return aService.broadcastScriptUpdates();
      });
  parentMessageManager.addMessageListener(
      'greasemonkey:script-install', aService.scriptInstall.bind(aService));
  parentMessageManager.addMessageListener(
      'greasemonkey:url-is-temp-file', aService.urlIsTempFile.bind(aService));

  // Yes, we have to load the frame script once here in the parent scope. Why!?
  globalMessageManager.loadFrameScript(
      'chrome://greasemonkey/content/framescript.js', true);

  // Beam down initial set of scripts.
  aService.broadcastScriptUpdates();

  // Notification is async; send the scripts again once we have our version.
  AddonManager.getAddonByID(GM_GUID, function(addon) {
    gGreasemonkeyVersion = '' + addon.version;
    aService.broadcastScriptUpdates();
  });

  // Beam down on updates.
  aService.config.addObserver({notifyEvent: function(script, event, data) {
    if (["modified", "install", "move", "edit-enabled", "uninstall", "cludes"]
        .some(function(e) {return e == event;})
      ) {
        aService.broadcastScriptUpdates();
      }
  }});

  Cu.import("chrome://greasemonkey-modules/content/requestObserver.js", {});

  Services.obs.addObserver(aService, 'quit-application', false);

  // Import this once, early, so that enqueued deletes can happen.
  Cu.import("chrome://greasemonkey-modules/content/util/enqueueRemoveFile.js");
}

/////////////////////////////////// Service ////////////////////////////////////

function service() {
  this.filename = Components.stack.filename;
  this.scriptValStores = {};
  this.wrappedJSObject = this;
}

////////////////////////////////// Constants ///////////////////////////////////

service.prototype.classDescription = DESCRIPTION;
service.prototype.classID = CLASSID;
service.prototype.contractID = CONTRACTID;
service.prototype.QueryInterface = XPCOMUtils.generateQI([Ci.nsIObserver]);

///////////////////////////////// nsIObserver //////////////////////////////////

service.prototype.observe = function(aSubject, aTopic, aData) {
  switch (aTopic) {
    case 'profile-after-change':
      startup(this);
      break;
    case 'quit-application':
      shutdown(this);
      break;
  }
};

///////////////////////////// Greasemonkey Service /////////////////////////////

service.prototype._config = null;
service.prototype.__defineGetter__('config', function() {
  if (!this._config) {
    // First guarantee instantiation and existence.  (So that anything,
    // including stuff inside i.e. config._load(), can call
    // i.e. config._changed().)
    this._config = new Config();
    // Then initialize.
    this._config.initialize();
  }
  return this._config;
});

service.prototype.scriptUpdateData = function() {
  var ipcScripts = this.config.scripts.map(function(script) {
    return new IPCScript(script, gGreasemonkeyVersion);
  });
  var excludes = this.config._globalExcludes;
  return {scripts: ipcScripts, globalExcludes: excludes};
};

service.prototype.broadcastScriptUpdates = function() {
  var ppmm = Cc["@mozilla.org/parentprocessmessagemanager;1"]
      .getService(Ci.nsIMessageBroadcaster);

  // Check if initialProcessData is supported, else child will use sync message.
  var data = this.scriptUpdateData();
  if (ppmm.initialProcessData) {
    // Initial data for any new processes.
    ppmm.initialProcessData["greasemonkey:scripts-update"] = data;
  }

  // Updates for existing ones.
  ppmm.broadcastAsyncMessage("greasemonkey:scripts-update", data);
};

service.prototype.closeAllScriptValStores = function() {
  for (var scriptId in this.scriptValStores) {
    var scriptValStore = this.scriptValStores[scriptId];
    scriptValStore.close();
  }
};

service.prototype.scriptRefresh = function(url, windowId, browser) {
  if (!GM_util.getEnabled()) return [];
  if (!url) return [];
  if (!GM_util.isGreasemonkeyable(url)) return [];

  if (GM_prefRoot.getValue('enableScriptRefreshing')) {
    this.config.updateModifiedScripts("document-start", url, windowId, browser);
    this.config.updateModifiedScripts("document-end", url, windowId, browser);
    this.config.updateModifiedScripts("document-idle", url, windowId, browser);
  }
};

service.prototype.getStoreByScriptId = function(aScriptId) {
  if ('undefined' == typeof this.scriptValStores[aScriptId]) {
    var script = this.config.getScriptById(aScriptId);
    this.scriptValStores[aScriptId] = new GM_ScriptStorageBack(script);
  }
  return this.scriptValStores[aScriptId];
};

service.prototype.handleScriptValMsg = function(aMessage) {
  var d = aMessage.data;
  var scriptStore = this.getStoreByScriptId(d.scriptId);
  switch (aMessage.name) {
  case 'greasemonkey:scriptVal-delete':
    return scriptStore.deleteValue(d.name);
  case 'greasemonkey:scriptVal-get':
    return scriptStore.getValue(d.name);
  case 'greasemonkey:scriptVal-list':
    return scriptStore.listValues();
  case 'greasemonkey:scriptVal-set':
    return scriptStore.setValue(d.name, d.val);
  default:
    dump(
        'Greasemonkey service handleScriptValMsg(): '
        + 'Unknown message name "' + aMessage.name + '".\n');
    break;
  }
};

service.prototype.scriptInstall = function(aMessage) {
  GM_util.showInstallDialog(aMessage.data.url);
};

service.prototype.urlIsTempFile = function(aMessage) {
  try {
    var file = gFileProtocolHandler.getFileFromURLSpec(aMessage.data.url);
  } catch (e) {
    return false;
  }
  return gTmpDir.contains(file);
};

//////////////////////////// Component Registration ////////////////////////////

var NSGetFactory = XPCOMUtils.generateNSGetFactory([service]);
