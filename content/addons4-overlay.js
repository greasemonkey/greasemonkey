// This file is concerned with altering the Firefox 4+ Add-ons Manager window,
// for those sorts of functionality we want that the API does not handle.  (As
// opposed to addons4.jsm which is responsible for what the API does handle.)
(function private_scope() {
Components.utils.import("resource://gre/modules/AddonManager.jsm");
Components.utils.import("resource://greasemonkey/addons4.js");
Components.utils.import('resource://greasemonkey/util.js');

var userScriptViewId = 'addons://list/user-script';

window.addEventListener('load', init, false);
window.addEventListener('unload', unload, false);

// Patch the default createItem() to add our custom property.
var _createItemOrig = createItem;
createItem = function GM_createItem(aObj, aIsInstall, aIsRemote) {
  var item = _createItemOrig(aObj, aIsInstall, aIsRemote);
  if (SCRIPT_ADDON_TYPE == aObj.type) {
   // Save a reference to this richlistitem on the Addon object, so we can
   // fix the 'executionIndex' attribute if/when it changes.
   aObj.richlistitem = item;
   setRichlistitemExecutionIndex(aObj);
  }
  return item;
};

// Patch the default loadView() to suppress the detail view for user scripts.
var _loadViewOrig = gViewController.loadView.bind(gViewController);
gViewController.loadView = function(aViewId) {
  if (userScriptViewId == gViewController.currentViewId
      && 0 === aViewId.indexOf('addons://detail/')
  ) {
    return false;
  }
  _loadViewOrig(aViewId);
};

// Set up an "observer" on the config, to keep the displayed items up to date
// with their actual state.
var observer = {
  notifyEvent: function observer_notifyEvent(script, event, data) {
    if (!isScriptView()) return;

    var addon = ScriptAddonFactoryByScript(script);
    switch (event) {
      case 'install':
        gListView.addItem(addon);
        setEmptyWarningVisible();
        break;
      case 'edit-enabled':
        addon.userDisabled = !data;
        var item = gListView.getListItemForID(addon.id);
        item.setAttribute('active', data);
        break;
      case 'modified':
        // Bust the addon cache, and get references to the old and new version.
        var oldAddon = ScriptAddonFactoryByScript({'id': data});
        ScriptAddonReplaceScript(script);
        addon = ScriptAddonFactoryByScript(script);

        // Use the addon references to update the view to match the new state.
        var item = createItem(addon);
        var oldItem = gListView.getListItemForID(oldAddon.id);
        oldItem.parentNode.replaceChild(item, oldItem);
        break;
      case 'update-found':
        var addon = ScriptAddonFactoryByScript(script)
        var scriptInstall = ScriptInstallFactoryByAddon(addon);
        AddonManagerPrivate.callAddonListeners('onNewInstall', scriptInstall);
        document.getElementById('updates-manualUpdatesFound-btn').hidden = false;
        break;
    }
  }
};

// \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ //

function addonIsInstalledScript(aAddon) {
  if (!aAddon) return false;
  if (SCRIPT_ADDON_TYPE != aAddon.type) return false;
  if (aAddon._script.needsUninstall) return false;
  return true;
};

function isScriptView() {
  return 'addons://list/user-script' == gViewController.currentViewId;
}

function addonExecutesNonFirst(aAddon) {
  if (!aAddon) return false;
  if (SCRIPT_ADDON_TYPE != aAddon.type) return false;
  return 0 != aAddon.executionIndex;
}

function addonExecutesNonLast(aAddon) {
  if (!aAddon) return false;
  if (SCRIPT_ADDON_TYPE != aAddon.type) return false;
  return (GM_util.getService().config.scripts.length - 1)
      != aAddon.executionIndex;
}

function sortedByExecOrder() {
  return document.getElementById('greasemonkey-sort-bar')
    .getElementsByAttribute('sortBy', 'executionIndex')[0]
    .hasAttribute('checkState');
};

function init() {
  GM_util.getService().config.addObserver(observer);

  gViewController.commands.cmd_userscript_edit = {
      isEnabled: addonIsInstalledScript,
      doCommand: function(aAddon) { GM_util.openInEditor(aAddon._script); }
    };
  gViewController.commands.cmd_userscript_show = {
      isEnabled: addonIsInstalledScript,
      doCommand: function(aAddon) { GM_openFolder(aAddon._script.file); }
    };

  gViewController.commands.cmd_userscript_execute_first = {
      isEnabled: addonExecutesNonFirst,
      doCommand: function(aAddon) { reorderScriptExecution(aAddon, -9999); }
    };
  gViewController.commands.cmd_userscript_execute_sooner = {
      isEnabled: addonExecutesNonFirst,
      doCommand: function(aAddon) { reorderScriptExecution(aAddon, -1); }
    };
  gViewController.commands.cmd_userscript_execute_later = {
      isEnabled: addonExecutesNonLast,
      doCommand: function(aAddon) { reorderScriptExecution(aAddon, 1); }
    };
  gViewController.commands.cmd_userscript_execute_last = {
      isEnabled: addonExecutesNonLast,
      doCommand: function(aAddon) { reorderScriptExecution(aAddon, 9999); }
    };

  window.addEventListener('ViewChanged', onViewChanged, false);
  onViewChanged(); // initialize on load as well as when it changes later

  document.getElementById('greasemonkey-sort-bar').addEventListener(
      'command', onSortersClicked, false);
  applySort();
};

function onSortersClicked(aEvent) {
  if ('button' != aEvent.target.tagName) return;
  var button = aEvent.target;

  var checkState = button.getAttribute('checkState');

  // Remove checkState from all buttons.
  var buttons = document.getElementById('greasemonkey-sort-bar')
      .getElementsByTagName('button');
  for (var i = 0, el = null; el = buttons[i]; i++) {
    el.removeAttribute('checkState');
  }

  // Toggle state of this button.
  if ('2' == checkState) {
    button.setAttribute('checkState', '1');
  } else {
    button.setAttribute('checkState', '2');
  }

  applySort();
};

function applySort() {
  // Find checked button.
  var buttons = document.getElementById('greasemonkey-sort-bar')
    .getElementsByTagName('button');
  for (var i = 0, button = null; button = buttons[i]; i++) {
    if (button.hasAttribute('checkState')) break;
  }

  var ascending = '1' != button.getAttribute('checkState');
  var sortBy=button.getAttribute('sortBy').split(',');

  var list = document.getElementById('addon-list');
  var elements = Array.slice(list.childNodes, 0);
  sortElements(elements, sortBy, ascending);
  while (list.listChild) list.removeChild(list.lastChild);
  elements.forEach(function(el) { list.appendChild(el); });
};

function onViewChanged(aEvent) {
  if (userScriptViewId == gViewController.currentViewId) {
    document.documentElement.className += ' greasemonkey';
    setEmptyWarningVisible();
    applySort();
  } else {
    document.documentElement.className = document.documentElement.className
        .replace(/ greasemonkey/g, '');
  }

  // Show which scripts have available updates.
  if (isScriptView()) {
    var scripts = GM_util.getService().config.getMatchingScripts(
        function (script) { return script.updateAvailable; });
    scripts.forEach(function (script) {
      var addon = ScriptAddonFactoryByScript(script)
      var scriptInstall = ScriptInstallFactoryByAddon(addon);
      AddonManagerPrivate.callAddonListeners("onNewInstall", scriptInstall);
    });
    if (scripts.length > 0) {
      document.getElementById("updates-manualUpdatesFound-btn").hidden = false;
    }
  }
};

function setEmptyWarningVisible() {
  var emptyWarning = document.getElementById('user-script-list-empty');
  emptyWarning.collapsed = !!GM_util.getService().config.scripts.length;
}

function selectScriptExecOrder() {
  if (sortedByExecOrder()) return;

  var button = document.getElementById('greasemonkey-sort-bar')
    .getElementsByAttribute('sortBy', 'executionIndex')[0];
  // Sort the script list by execution order
  onSortersClicked({'target': button});
};

function reorderScriptExecution(aAddon, moveBy) {
  selectScriptExecOrder();
  GM_util.getService().config.move(aAddon._script, moveBy);
  AddonManager.getAddonsByTypes([SCRIPT_ADDON_TYPE], function(aAddons) {
      // Fix all the 'executionOrder' attributes.
      for (var i = 0, addon = null; addon = aAddons[i]; i++) {
        setRichlistitemExecutionIndex(addon);
      }
      // Re-sort the list, with these fixed attributes.
      applySort();
      // Ensure the selected element is still visible.
      var richlistbox = document.getElementById('addon-list');
      richlistbox.ensureElementIsVisible(richlistbox.currentItem);
    });
};

function setRichlistitemExecutionIndex(aAddon) {
  aAddon.richlistitem.setAttribute('executionIndex',
      // String format with leading zeros, so it will sort properly.
      ('0000' + aAddon.executionIndex).substr(-5));
};

function unload() {
  var GM_config = GM_util.getService().config;
  // Since .getAddonsByTypes() is asynchronous, AddonManager gets destroyed
  // by the time the callback runs.  Cache this value we need from it.
  var pending_uninstall = AddonManager.PENDING_UNINSTALL;

  AddonManager.getAddonsByTypes([SCRIPT_ADDON_TYPE], function(aAddons) {
      var didUninstall = false;
      for (var i = 0, addon = null; addon = aAddons[i]; i++) {
        if (addon.pendingOperations & pending_uninstall) {
          addon.performUninstall();
          didUninstall = true;
        }
      }
      // Guarantee that the config.xml is saved to disk.
      // Todo: This without dipping into private members.
      if (didUninstall) GM_config._save(true);
    });

  GM_config.removeObserver(observer);
};
})();

function GM_openUserscriptsOrg() {
  var chromeWin = GM_util.getBrowserWindow();
  chromeWin.gBrowser.selectedTab = chromeWin.gBrowser.addTab(
      'http://userscripts.org');
}
