// This file specifically targets integration with the add-ons tab in Firefox
// 4+, thus it makes liberal use of features only available there.
//
// Derived from the SlipperyMonkey extension originally by Dave Townsend:
//   http://hg.oxymoronical.com/extensions/SlipperyMonkey/
//   http://www.oxymoronical.com/blog/2010/07/How-to-extend-the-new-Add-ons-Manager

// Module exported symbols.
var EXPORTED_SYMBOLS = ['GM_addonsStartup', 'ScriptAddonFactoryByScript', 'ScriptAddonReplaceScript'];

////////////////////////////////////////////////////////////////////////////////
// Module level imports / constants / globals.
////////////////////////////////////////////////////////////////////////////////

Components.utils.import('resource://gre/modules/AddonManager.jsm');
Components.utils.import('resource://gre/modules/Services.jsm');
Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

const Cc = Components.classes;
const Ci = Components.interfaces;
const NS_XHTML = 'http://www.w3.org/1999/xhtml';
const SCRIPT_ID_SUFFIX = '@greasespot.net';

// Pull this helper method into this module scope; it's not module-ized yet.
var GM_getConfig;
(function() {
var loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
    .getService(Components.interfaces.mozIJSSubScriptLoader);
var scope = {};
loader.loadSubScript('chrome://greasemonkey/content/utils.js', scope);
GM_getConfig = scope.GM_getConfig;
})();

////////////////////////////////////////////////////////////////////////////////
// Addons API Integration
////////////////////////////////////////////////////////////////////////////////

var AddonProvider = {
  getAddonByID: function(aId, aCallback) {
    aCallback(ScriptAddonFactoryById(aId));
  },

  getAddonsByTypes: function(aTypes, aCallback) {
    if (aTypes && aTypes.indexOf('user-script') < 0) {
      aCallback([]);
    } else {
      var scriptAddons = [];
      GM_getConfig().scripts.forEach(function(script) {
        scriptAddons.push(ScriptAddonFactoryByScript(script));
      });
      aCallback(scriptAddons);
    }
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
  var scripts = GM_getConfig().getMatchingScripts(
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
  this.iconURL = this._script.icon.fileURL;
  this.size = this._script.size;
  this.updateDate = this._script.modifiedDate;
}

// Required attributes.
ScriptAddon.prototype.id = null;
ScriptAddon.prototype.version = null;
ScriptAddon.prototype.type = 'user-script';
ScriptAddon.prototype.isCompatible = true;
ScriptAddon.prototype.providesUpdatesSecurely = true;
ScriptAddon.prototype.blocklistState = 0;
ScriptAddon.prototype.appDisabled = false;
ScriptAddon.prototype.scope = AddonManager.SCOPE_PROFILE;
ScriptAddon.prototype.name = null;
ScriptAddon.prototype.creator = null;
ScriptAddon.prototype.pendingOperations = 0;

// Optional attributes
ScriptAddon.prototype.description = null;
ScriptAddon.prototype.size = null;

// Private and custom attributes.
ScriptAddon.prototype._script = null;

ScriptAddon.prototype.__defineGetter__('executionIndex',
function ScriptAddon_prototype_getter_executionIndex() {
  return GM_getConfig()._scripts.indexOf(this._script);
});

// Getters/setters/functions for API attributes.
ScriptAddon.prototype.__defineGetter__('isActive',
function ScriptAddon_prototype_getter_isActive() {
  return this._script.enabled;
});

ScriptAddon.prototype.__defineGetter__('userDisabled',
function ScriptAddon_prototype_getter_userDisabled() {
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
function ScriptAddon_prototype_getter_permissions() {
  var perms = AddonManager.PERM_CAN_UNINSTALL;
  perms |= this.userDisabled
      ? AddonManager.PERM_CAN_ENABLE
      : AddonManager.PERM_CAN_DISABLE;
  return perms;
});

ScriptAddon.prototype.isCompatibleWith = function() {
  return true;
};

ScriptAddon.prototype.findUpdates = function(aListener) {
  if ('onNoCompatibilityUpdateAvailable' in aListener) {
    aListener.onNoCompatibilityUpdateAvailable(this);
  }
  if ('onNoUpdateAvailable' in aListener) {
    aListener.onNoUpdateAvailable(this);
  }
  if ('onUpdateFinished' in aListener) {
    aListener.onUpdateFinished(this);
  }
};

ScriptAddon.prototype.uninstall = function() {
  AddonManagerPrivate.callAddonListeners("onUninstalling", this, false);
  // TODO: pick an appropriate time, and act on these pending uninstalls.
  this.pendingOperations |= AddonManager.PENDING_UNINSTALL;
  AddonManagerPrivate.callAddonListeners("onUninstalled", this);
};

ScriptAddon.prototype.cancelUninstall = function() {
  this.pendingOperations ^= AddonManager.PENDING_UNINSTALL;
  AddonManagerPrivate.callAddonListeners("onOperationCancelled", this);
};

////////////////////////////////////////////////////////////////////////////////

var WindowObserver = {
  // Inject the 'User Scripts' choice into the list of add-on types.
  addToAddonsManager: function(aWindow) {
    // This function used to handle tasks that are now done in a XUL overlay.
    // Leaving the function here in case the routing to make it run at the
    // right time proves useful.
    // TODO: Remove once Firefox 4 is final, if it is still unused.
  },

  findAllAddonsManagers: function() {
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

  addToAddonsManagers: function() {
    var managers = this.findAllAddonsManagers();
    managers.forEach(function(aWindow) {
      this.addToAddonsManager(aWindow);
    }, this);
  },

  /* TODO: restore when we are restartless for FF4.
  removeFromAddonsManagers: function() {
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

  observe: function(aSubject, aTopic, aData) {
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
  AddonManagerPrivate.registerProvider(AddonProvider);
  WindowObserver.addToAddonsManagers();
}

/* TODO: restore when we are restartless for FF4.
function addonsShutdown() {
  WindowObserver.removeFromAddonsManagers();
  AddonManagerPrivate.unregisterProvider(AddonProvider);
  Services.obs.removeObserver(WindowObserver, 'chrome-document-global-created');
}
*/
