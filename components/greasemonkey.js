///////////////////////// Component-global "Constants" /////////////////////////

var DESCRIPTION = "GM_GreasemonkeyService";
var CONTRACTID = "@greasemonkey.mozdev.org/greasemonkey-service;1";
var CLASSID = Components.ID("{77bf3650-1cd6-11da-8cd6-0800200c9a66}");

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

Cu.import("resource://greasemonkey/ipcscript.js");
Cu.import("resource://greasemonkey/menucommand.js");
Cu.import("resource://greasemonkey/prefmanager.js");
Cu.import("resource://greasemonkey/storageBack.js");
Cu.import("resource://greasemonkey/sync.js");
Cu.import("resource://greasemonkey/util.js");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");


var gStartupHasRun = false;

var gFileProtocolHandler = Components
    .classes["@mozilla.org/network/protocol;1?name=file"]
    .getService(Ci.nsIFileProtocolHandler);
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

  var messageManager = Cc["@mozilla.org/globalmessagemanager;1"]
      .getService(Ci.nsIMessageListenerManager);

  messageManager.addMessageListener(
      'greasemonkey:script-install', aService.scriptInstall.bind(aService));
  messageManager.addMessageListener(
      'greasemonkey:scripts-for-url', aService.getScriptsForUrl.bind(aService));

  var scriptValHandler = aService.handleScriptValMsg.bind(aService);
  messageManager.addMessageListener(
    'greasemonkey:scriptVal-delete', scriptValHandler);
  messageManager.addMessageListener(
    'greasemonkey:scriptVal-get', scriptValHandler);
  messageManager.addMessageListener(
    'greasemonkey:scriptVal-list', scriptValHandler);
  messageManager.addMessageListener(
    'greasemonkey:scriptVal-set', scriptValHandler);

  messageManager.loadFrameScript(
      "chrome://greasemonkey/content/framescript.js", true);

  Services.obs.addObserver(aService, 'quit-application', false);

  // Import this once, early, so that enqueued deletes can happen.
  Cu.import("resource://greasemonkey/util/enqueueRemoveFile.js");
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

service.prototype.closeAllScriptValStores = function() {
  for (var scriptId in this.scriptValStores) {
    var scriptValStore = this.scriptValStores[scriptId];
    scriptValStore.close();
  }
};

service.prototype.getScriptsForUrl = function(aMessage) {
  var url = aMessage.data.url;
  var when = aMessage.data.when;
  var windowId = aMessage.data.windowId;
  var browser = aMessage.target;

  if (!GM_util.getEnabled() || !url) return [];
  if (!GM_util.isGreasemonkeyable(url)) return [];

  if (GM_prefRoot.getValue('enableScriptRefreshing')) {
    this.config.updateModifiedScripts(when, url, windowId, browser);
  }

  var scripts = this.config.getMatchingScripts(function(script) {
    try {
      return GM_util.scriptMatchesUrlAndRuns(script, url, when);
    } catch (e) {
      GM_util.logError(e, false, e.fileName, e.lineNumber);
      // See #1692; Prevent failures like that from being so severe.
      return false;
    }
  }).map(function(script) {
    // Make the script serializable so it can be sent to the frame script.
    return new IPCScript(script);
  });

  return scripts;
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
  dump('>>> component scriptInstall ... '+aMessage.data+'\n');
  GM_util.showInstallDialog(aMessage.data.url, aMessage.target);
};

//////////////////////////// Component Registration ////////////////////////////

var NSGetFactory = XPCOMUtils.generateNSGetFactory([service]);
