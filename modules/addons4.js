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
    ];

////////////////////////////////////////////////////////////////////////////////
// Module level imports / constants / globals.
////////////////////////////////////////////////////////////////////////////////

Components.utils.import('resource://gre/modules/AddonManager.jsm');
Components.utils.import('resource://gre/modules/Services.jsm');
Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
Components.utils.import('resource://greasemonkey/prefmanager.js');
Components.utils.import('resource://greasemonkey/remoteScript.js');
Components.utils.import('resource://greasemonkey/util.js');

var Cc = Components.classes;
var Ci = Components.interfaces;
var NS_XHTML = 'http://www.w3.org/1999/xhtml';
var SCRIPT_ID_SUFFIX = '@greasespot.net';
var SCRIPT_ADDON_TYPE = 'greasemonkey-user-script';

var gVersionChecker = Components
    .classes["@mozilla.org/xpcom/version-comparator;1"]
    .getService(Components.interfaces.nsIVersionComparator);

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
      if (!script.availableUpdate) return;

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
  return this._script.checkRemoteUpdates;
});

ScriptAddon.prototype.__defineSetter__('applyBackgroundUpdates',
function ScriptAddon_SetApplyBackgroundUpdates(aVal) {
  this._script.checkRemoteUpdates = aVal;
  this._script._changed('modified', null);
  AddonManagerPrivate.callAddonListeners(
      'onPropertyChanged', this, ['applyBackgroundUpdates']);
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
  return 'chrome://greasemonkey/content/scriptprefs.xul#'
      + btoa(this._script.id);
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
  if (this._script.isRemoteUpdateAllowed()) {
    perms |= AddonManager.PERM_CAN_UPGRADE;
  }
  return perms;
});

ScriptAddon.prototype.isCompatibleWith = function() {
  return true;
};

ScriptAddon.prototype.findUpdates = function(aUpdateListener, aReason) {
  this._script.checkForRemoteUpdate(
      GM_util.hitch(this, this._handleRemoteUpdate, aUpdateListener));
};

ScriptAddon.prototype._handleRemoteUpdate = function(
    aUpdateListener, aAvailable) {
  function tryToCall(obj, methName) {
    if (obj && ('undefined' != typeof obj[methName])) {
      obj[methName].apply(obj, Array.prototype.slice.call(arguments, 2));
    }
  }

  try {
    if (aAvailable) {
      // Purge any possible ScriptInstall cache.
      if (this.id in ScriptInstallCache) {
        delete ScriptInstallCache[this.id];
      }
      // Then create one with this newly found update info.
      var scriptInstall = ScriptInstallFactoryByAddon(
          this, this._script);
      AddonManagerPrivate.callInstallListeners(
          'onNewInstall', [], scriptInstall);
      tryToCall(aUpdateListener, 'onUpdateAvailable', this, scriptInstall);
    } else {
      tryToCall(aUpdateListener, 'onNoUpdateAvailable', this);
    }
    tryToCall(aUpdateListener, 'onUpdateFinished', this,
        AddonManager.UPDATE_STATUS_NO_ERROR);
  } catch (e) {
    // See #1621.  Don't die if (e.g.) an addon listener doesn't provide
    // the entire interface and thus a method is undefined.
    Components.utils.reportError(e);
    tryToCall(aUpdateListener, 'onUpdateFinished', this,
        AddonManager.UPDATE_STATUS_DOWNLOAD_ERROR);
  }
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
  var newScript = aAddon._script.availableUpdate;
  this.iconURL = newScript.icon.fileURL;
  this.name = newScript.name;
  this.version = newScript.version;

  this._script = aAddon._script;
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
  AddonManagerPrivate.callInstallListeners(
      'onDownloadStarted', this._listeners);
  this.state = AddonManager.STATE_DOWNLOADING;

  var rs = new RemoteScript(this._script._downloadURL);
  rs.messageName = 'script.updated';
  rs.onProgress(this._progressCallback);
  rs.download(GM_util.hitch(this, function(aSuccess, aType) {
    if (aSuccess && 'dependencies' == aType) {
      this._progressCallback(rs, 'progress', 1);
      AddonManagerPrivate.callInstallListeners(
          'onDownloadEnded', this._listeners);

      // See #1659 .  Pick the biggest of "remote version" (possibly from an
      // @updateURL file) and "downloaded version".
      // Tricky note: in this scope "rs.script" is the script object that
      // was just downloaded; "this._script" is the previously existing script
      // that rs.install() just removed from the config, to update it.
      if (gVersionChecker.compare(
          this._script.availableUpdate.version, rs.script.version) > 0
      ) {
        rs.script._version = this._script.availableUpdate.version;
      }

      this.state = AddonManager.STATE_INSTALLING;
      AddonManagerPrivate.callInstallListeners(
          'onInstallStarted', this._listeners);
      rs.install(this._script);
      rs.script._changed('modified');
      AddonManagerPrivate.callInstallListeners(
          'onInstallEnded', this._listeners);
    } else if (!aSuccess) {
      this.state = AddonManager.STATE_DOWNLOAD_FAILED;
      AddonManagerPrivate.callInstallListeners(
          'onDownloadFailed', this._listeners);
    }
  }));
};

ScriptInstall.prototype._progressCallback = function(
    aRemoteScript, aType, aData) {
  this.maxProgress = 100;
  this.progress = Math.floor(aData * 100);
  AddonManagerPrivate.callInstallListeners(
      'onDownloadProgress', this._listeners);
};

ScriptInstall.prototype.cancel = function() {
  this.state = AddonManager.STATE_AVAILABLE;
  AddonManagerPrivate.callInstallListeners(
      'onInstallEnded', this._listeners, this, this.existingAddon);
  AddonManagerPrivate.callInstallListeners(
      'onInstallCancelled', this._listeners, this, this.existingAddon);
  if (this._remoteScript) {
    this._remoteScript.cleanup();
    this._remoteScript = null;
  }
};

ScriptInstall.prototype.addListener = function(aListener) {
  if (!this._listeners.some(function(i) { return i == aListener; })) {
    this._listeners.push(aListener);
  }
};

ScriptInstall.prototype.removeListener = function(aListener) {
  this._listeners =
      this._listeners.filter(function(i) { return i != aListener; });
};

ScriptInstall.prototype.toString = function() {
  return '[ScriptInstall object ' + this._script.id + ']';
};

////////////////////////////////////////////////////////////////////////////////

var _addonsStartupHasRun = false;
function GM_addonsStartup(aParams) {
  if (_addonsStartupHasRun) return;
  _addonsStartupHasRun = true;

  var stringBundle = Components
      .classes["@mozilla.org/intl/stringbundle;1"]
      .getService(Components.interfaces.nsIStringBundleService)
      .createBundle("chrome://greasemonkey/locale/gm-addons.properties");

  AddonManagerPrivate.registerProvider(
      AddonProvider,
      [{
        'id': 'greasemonkey-user-script',
        'name': stringBundle.GetStringFromName('userscripts'),
        'uiPriority': 4500,
        'viewType': AddonManager.VIEW_TYPE_LIST,
      }]);
}
