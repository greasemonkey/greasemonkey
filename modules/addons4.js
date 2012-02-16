// This file specifically targets integration with the add-ons tab in Firefox
// 4+, thus it makes liberal use of features only available there.
//
// Derived from the SlipperyMonkey extension originally by Dave Townsend:
//   http://hg.oxymoronical.com/extensions/SlipperyMonkey/
//   http://www.oxymoronical.com/blog/2010/07/How-to-extend-the-new-Add-ons-Manager

// Module exported symbols.
var EXPORTED_SYMBOLS = [
    'GM_addonsStartup', 'SCRIPT_ADDON_TYPE',
    'ScriptAddonFactoryByScript', 'ScriptAddonReplaceScript',
    'ScriptInstallFactoryByAddon',
    ];

////////////////////////////////////////////////////////////////////////////////
// Module level imports / constants / globals.
////////////////////////////////////////////////////////////////////////////////

Components.utils.import('resource://gre/modules/AddonManager.jsm');
Components.utils.import('resource://gre/modules/Services.jsm');
Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
Components.utils.import('resource://greasemonkey/prefmanager.js');
Components.utils.import('resource://greasemonkey/util.js');

var Cc = Components.classes;
var Ci = Components.interfaces;
var NS_XHTML = 'http://www.w3.org/1999/xhtml';
var SCRIPT_ID_SUFFIX = '@greasespot.net';
var SCRIPT_ADDON_TYPE = 'user-script';

////////////////////////////////////////////////////////////////////////////////
// Addons API Integration
////////////////////////////////////////////////////////////////////////////////

var AddonProvider = {
  getAddonByID: function AddonProvider_getAddonByID(aId, aCallback) {
    aCallback(ScriptAddonFactoryById(aId));
  },

  getAddonsByTypes: function AddonProvider_getAddonsByTypes(aTypes, aCallback) {
    if (aTypes && aTypes.indexOf(SCRIPT_ADDON_TYPE) < 0) {
      aCallback([]);
    } else {
      var scriptAddons = [];
      GM_util.getService().config.scripts.forEach(function(script) {
        scriptAddons.push(ScriptAddonFactoryByScript(script));
      });
      aCallback(scriptAddons);
    }
  },

  getInstallsByTypes: function(aTypes, aCallback) {
    var scriptInstalls = [];
    GM_util.getService().config.scripts.forEach(function(script) {
      if (!script.updateAvailable) return;

      var aAddon = ScriptAddonFactoryByScript(script);
      var scriptInstall = ScriptInstallFactoryByAddon(aAddon);

      scriptInstalls.push(scriptInstall);
    });
    aCallback(scriptInstalls);
  }
};

var ScriptAddonCache = {};
function ScriptAddonFactoryByScript(aScript) {
  var id = aScript.id + SCRIPT_ID_SUFFIX;
  if (!(id in ScriptAddonCache)) {
    ScriptAddonCache[id] = new ScriptAddon(aScript);
  }
  return ScriptAddonCache[id];
}
function ScriptAddonFactoryById(aId) {
  var scripts = GM_util.getService().config.getMatchingScripts(
      function(script) {
        return (script.id + SCRIPT_ID_SUFFIX) == aId;
      });
  if (1 == scripts.length) return ScriptAddonFactoryByScript(scripts[0]);
  // TODO: throw an error instead?
  return null;
}
function ScriptAddonReplaceScript(aScript) {
  var id = aScript.id + SCRIPT_ID_SUFFIX;
  ScriptAddonCache[id] = new ScriptAddon(aScript);
  return ScriptAddonCache[id];
}

// https://developer.mozilla.org/en/Addons/Add-on_Manager/Addon
function ScriptAddon(aScript) {
  this._script = aScript;

  this.id = aScript.id + SCRIPT_ID_SUFFIX;
  this.name = this._script.name;
  this.version = this._script.version;
  this.description = this._script.description;
  this.iconURL = this._script.icon && this._script.icon.fileURL;
  this.updateDate = this._script.modifiedDate;
  this.providesUpdatesSecurely = aScript.updateIsSecure;
}

// Required attributes.
ScriptAddon.prototype.id = null;
ScriptAddon.prototype.version = null;
ScriptAddon.prototype.type = SCRIPT_ADDON_TYPE;
ScriptAddon.prototype.isCompatible = true;
ScriptAddon.prototype.blocklistState = 0;
ScriptAddon.prototype.appDisabled = false;
ScriptAddon.prototype.scope = AddonManager.SCOPE_PROFILE;
ScriptAddon.prototype.name = null;
ScriptAddon.prototype.creator = null;
ScriptAddon.prototype.pendingOperations = 0;
ScriptAddon.prototype.operationsRequiringRestart = AddonManager.OP_NEEDS_RESTART_NONE;

// Optional attributes
ScriptAddon.prototype.description = null;

// Private and custom attributes.
ScriptAddon.prototype._script = null;

ScriptAddon.prototype.__defineGetter__('applyBackgroundUpdates',
function ScriptAddon_getApplyBackgroundUpdates() {
  return GM_prefRoot.getValue('autoInstallUpdates')
      ? AddonManager.AUTOUPDATE_ENABLE : AddonManager.AUTOUPDATE_DISABLE;
});

ScriptAddon.prototype.__defineGetter__('executionIndex',
function ScriptAddon_getExecutionIndex() {
  return GM_util.getService().config._scripts.indexOf(this._script);
});

// Getters/setters/functions for API attributes.
ScriptAddon.prototype.__defineGetter__('isActive',
function ScriptAddon_getIsActive() {
  return this._script.enabled;
});

ScriptAddon.prototype.__defineGetter__('optionsURL',
function ScriptAddon_getOptionsURL() {
  return 'chrome://greasemonkey/content/scriptprefs.xul#' + this._script.id;
});

ScriptAddon.prototype.__defineGetter__('userDisabled',
function ScriptAddon_getUserDisabled() {
  return !this._script.enabled;
});

ScriptAddon.prototype.__defineSetter__('userDisabled',
function ScriptAddon_prototype_setter_userDisabled(val) {
  if (val == this.userDisabled) {
    return val;
  }

  AddonManagerPrivate.callAddonListeners(
      val ? 'onEnabling' : 'onDisabling', this, false);
  this._script.enabled = !val;
  AddonManagerPrivate.callAddonListeners(
      val ? 'onEnabled' : 'onDisabled', this);
});

ScriptAddon.prototype.__defineGetter__('permissions',
function ScriptAddon_getPermissions() {
  var perms = AddonManager.PERM_CAN_UNINSTALL;
  perms |= this.userDisabled
      ? AddonManager.PERM_CAN_ENABLE
      : AddonManager.PERM_CAN_DISABLE;
  if (this._script.updateURL) perms |= AddonManager.PERM_CAN_UPGRADE;
  return perms;
});

ScriptAddon.prototype.isCompatibleWith = function() {
  return true;
};

ScriptAddon.prototype.findUpdates = function(aListener, aReason) {
  function updateCallback(aAvailable) {
    this._script.handleRemoteUpdate(aAvailable, aListener);
  }
  this._script.checkForRemoteUpdate(true, GM_util.hitch(this, updateCallback));
};

ScriptAddon.prototype.toString = function() {
  return '[ScriptAddon object ' + this.id + ']';
};

ScriptAddon.prototype.uninstall = function() {
  AddonManagerPrivate.callAddonListeners('onUninstalling', this, false);
  // TODO: pick an appropriate time, and act on these pending uninstalls.
  this.pendingOperations |= AddonManager.PENDING_UNINSTALL;
  AddonManagerPrivate.callAddonListeners('onUninstalled', this);
};

ScriptAddon.prototype.cancelUninstall = function() {
  this.pendingOperations ^= AddonManager.PENDING_UNINSTALL;
  AddonManagerPrivate.callAddonListeners('onOperationCancelled', this);
};

ScriptAddon.prototype.performUninstall = function() {
  GM_util.getService().config.uninstall(this._script);
  delete ScriptAddonCache[this.id];
};

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

var ScriptInstallCache = {};
function ScriptInstallFactoryByAddon(aAddon) {
  if (!(aAddon.id in ScriptInstallCache)) {
    ScriptInstallCache[aAddon.id] = new ScriptInstall(aAddon);
  }
  return ScriptInstallCache[aAddon.id];
}

function ScriptInstall(aAddon) {
  this._script = aAddon._script;

  this.name = this._script.name;
  this.version = this._script.version;
  this.iconURL = this._script.icon.fileURL;
  this.existingAddon = aAddon;

  this._listeners = [];
}

// Required attributes.
ScriptInstall.prototype.addon = null;
ScriptInstall.prototype.error = null;
ScriptInstall.prototype.file = null;
ScriptInstall.prototype.maxProgress = -1;
ScriptInstall.prototype.progress = 0;
ScriptInstall.prototype.releaseNotesURI = null;
ScriptInstall.prototype.sourceURI = null;
ScriptInstall.prototype.state = AddonManager.STATE_AVAILABLE;
ScriptInstall.prototype.type = 'user-script';

// Private and custom attributes.
ScriptInstall.prototype._script = null;

ScriptInstall.prototype.install = function() {
  function progressCallback(aRemoteScript, aType, aData) {
    this.maxProgress = 100;
    this.progress = Math.floor(aData * 100);
    AddonManagerPrivate.callInstallListeners(
        'onDownloadProgress', this._listeners, this);
  }

  AddonManagerPrivate.callAddonListeners('onInstallStarted', this);
  this.state = AddonManager.STATE_DOWNLOADING;
  this._remoteScript = this._script.installUpdate(
      GM_util.hitch(this, progressCallback));
};

ScriptInstall.prototype.cancel = function() {
  this.state = AddonManager.STATE_AVAILABLE;
  AddonManagerPrivate.callAddonListeners(
      'onInstallEnded', this, this.existingAddon);
  if (this._remoteScript) {
    this._remoteScript.cleanup();
    this._remoteScript = null;
  }
};

ScriptInstall.prototype.addListener = function AI_addListener(aListener) {
  if (!this._listeners.some(function(i) { return i == aListener; })) {
    this._listeners.push(aListener);
  }
};

ScriptInstall.prototype.removeListener = function AI_removeListener(aListener) {
  this._listeners =
      this._listeners.filter(function(i) { return i != aListener; });
};

ScriptInstall.prototype.toString = function() {
  return '[ScriptInstall object ' + this._script.id + ']';
};

////////////////////////////////////////////////////////////////////////////////

var WindowObserver = {
  // Inject the 'User Scripts' choice into the list of add-on types.
  addToAddonsManager: function WindowObserver_addToAddonsManager(aWindow) {
    // This function used to handle tasks that are now done in a XUL overlay.
    // Leaving the function here in case the routing to make it run at the
    // right time proves useful.
    // TODO: Remove once Firefox 4 is final, if it is still unused.
  },

  findAllAddonsManagers: function WindowObserver_findAllAddonsManagers() {
    var managers = [];
    var windows = Services.wm.getEnumerator('navigator:browser');
    while (windows.hasMoreElements()) {
      var window = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
      window.gBrowser.browsers.forEach(function(aBrowser) {
        if (aBrowser.currentURI.spec == 'about:addons')
          managers.push(aBrowser.contentWindow);
      });
    }
    return managers;
  },

  addToAddonsManagers: function WindowObserver_addToAddonsManagers() {
    var managers = this.findAllAddonsManagers();
    managers.forEach(function(aWindow) {
      this.addToAddonsManager(aWindow);
    }, this);
  },

  /* TODO: restore when we are restartless for FF4.
  removeFromAddonsManagers: function WindowObserver_removeFromAddonsManagers() {
    var managers = this.findAllAddonsManagers();
    managers.forEach(function(aWindow) {
      var window = aWindow.wrappedJSObject;
      var scripts = window.document.getElementById('category-scripts');
      scripts.parentNode.removeChild(scripts);
      var styles = window.document.getElementById('script-styles');
      styles.parentNode.removeChild(styles);
      window.gStrings.ext = window.gStrings.ext.basebundle;
    });
  },
  */

  observe: function WindowObserver_observe(aSubject, aTopic, aData) {
    var win = aSubject;
    var uri = win.document.documentURIObject;
    if (uri.spec != 'about:addons') return;
    // Run after DOM load, so that the window contents exist, to be altered.
    win.addEventListener('DOMContentLoaded',
        function() { WindowObserver.addToAddonsManager(win); },
        false);
  }
};

////////////////////////////////////////////////////////////////////////////////

var _addonsStartupHasRun = false;
function GM_addonsStartup(aParams) {
  if (_addonsStartupHasRun) return;
  _addonsStartupHasRun = true;

  Services.obs.addObserver(WindowObserver, 'chrome-document-global-created', false);
  AddonManagerPrivate.registerProvider(AddonProvider,
      [{'id': 'user-script'}]);
  WindowObserver.addToAddonsManagers();
}

/* TODO: restore when we are restartless for FF4.
function addonsShutdown() {
  WindowObserver.removeFromAddonsManagers();
  AddonManagerPrivate.unregisterProvider(AddonProvider);
  Services.obs.removeObserver(WindowObserver, 'chrome-document-global-created');
}
*/
