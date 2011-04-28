// This file is concerned with altering the Firefox 4+ Add-ons Manager window,
// for those sorts of functionality we want that the API does not handle.  (As
// opposed to addons4.jsm which is responsible for what the API does handle.)
(function() {
Components.utils.import("resource://gre/modules/AddonManager.jsm");
Components.utils.import("resource://greasemonkey/addons4.js");

var sortersContainer;
var sortExecuteOrderButton;
var stringBundle;

window.addEventListener('load', init, false);
window.addEventListener('unload', unload, false);

// Patch the default createItem() to add our custom property.
_createItemOrig = createItem;
createItem = function GM_createItem(aObj, aIsInstall, aIsRemote) {
  var item = _createItemOrig(aObj, aIsInstall, aIsRemote);
  if ('user-script' == aObj.type) {
   // Save a reference to this richlistitem on the Addon object, so we can
   // fix the 'executionIndex' attribute if/when it changes.
   aObj.richlistitem = item;
   setRichlistitemExecutionIndex(aObj);
  }
  return item;
};

// Set up an "observer" on the config, to keep the displayed items up to date
// with their actual state.
var observer = {
  notifyEvent: function(script, event, data) {
    if ('addons://list/user-script' != gViewController.currentViewId) return;

    var addon = ScriptAddonFactoryByScript(script);
    switch (event) {
      case 'install':
        gListView.addItem(addon);
        break;
      case "edit-enabled":
        addon.userDisabled = !data;
        var item = gListView.getListItemForID(addon.id);
        item.setAttribute('active', data);
        break;
      case 'modified':
        ScriptAddonReplaceScript(script);

        var oldAddon = ScriptAddonFactoryByScript({'id': data});
        var item = createItem(addon);
        var oldItem = gListView.getListItemForID(oldAddon.id);
        oldItem.parentNode.replaceChild(item, oldItem);
        break;
    }
  }
};

// \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ //

function addonIsInstalledScript(aAddon) {
  if (!aAddon) return false;
  if ('user-script' != aAddon.type) return false;
  if (aAddon._script.needsUninstall) return false;
  return true;
};

function init() {
  GM_getConfig().addObserver(observer);

  gViewController.commands.cmd_userscript_edit = {
      isEnabled: addonIsInstalledScript,
      doCommand: function(aAddon) { GM_openInEditor(aAddon._script); }
    };
  gViewController.commands.cmd_userscript_show = {
      isEnabled: addonIsInstalledScript,
      doCommand: function(aAddon) { GM_openFolder(aAddon._script.file); }
    };

  gViewController.commands.cmd_userscript_execute_first = {
      isEnabled: function() { return true; },
      doCommand: function(aAddon) { reorderScriptExecution(aAddon, -9999); }
    };
  gViewController.commands.cmd_userscript_execute_sooner = {
      isEnabled: function() { return true; },
      doCommand: function(aAddon) { reorderScriptExecution(aAddon, -1); }
    };
  gViewController.commands.cmd_userscript_execute_later = {
      isEnabled: function() { return true; },
      doCommand: function(aAddon) { reorderScriptExecution(aAddon, 1); }
    };
  gViewController.commands.cmd_userscript_execute_last = {
      isEnabled: function() { return true; },
      doCommand: function(aAddon) { reorderScriptExecution(aAddon, 9999); }
    };

  document.getElementById('addonitem-popup').addEventListener(
      'popupshowing', onContextPopupShowing, false);

  window.addEventListener('ViewChanged', onViewChanged, false);
  onViewChanged(); // initialize on load as well as when it changes later

  document.getElementById('greasemonkey-sort-bar').addEventListener(
      'command', onSortersClicked, false);
  applySort();
};

function onContextPopupShowing(aEvent) {
  var popup = aEvent.target;
  var selectedItem = gListView._listBox.selectedItem ||
    gSearchView._listBox.selectedItem;
  var selectedIsUserScript = (selectedItem &&
      'user-script' == selectedItem.getAttribute('type')
      );

  for (var i = 0, menuitem = null; menuitem = popup.children[i]; i++) {
    var menuitemIsUserScript = ('user-script' == menuitem.getAttribute('type'));
    menuitem.collapsed = selectedIsUserScript != menuitemIsUserScript;
  }
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
  var emptyWarning = document.getElementById('user-script-list-empty');
  if ('addons://list/user-script' == gViewController.currentViewId) {
    document.documentElement.className += ' greasemonkey';
    emptyWarning.collapsed = !!GM_getConfig().scripts.length;
  } else {
    document.documentElement.className = document.documentElement.className
        .replace(/ greasemonkey/g, '');
  }
};

function reorderScriptExecution(aAddon, moveBy) {
  GM_getConfig().move(aAddon._script, moveBy);
  AddonManager.getAddonsByTypes(['user-script'], function(aAddons) {
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
  var GM_config = GM_getConfig();
  // Since .getAddonsByTypes() is asynchronous, AddonManager gets destroyed
  // by the time the callback runs.  Cache this value we need from it.
  var pending_uninstall = AddonManager.PENDING_UNINSTALL;

  AddonManager.getAddonsByTypes(['user-script'], function(aAddons) {
      for (var i = 0, addon = null; addon = aAddons[i]; i++) {
        if (addon.pendingOperations & pending_uninstall) {
          // Todo: This without dipping into private members.
          GM_config.uninstall(addon._script);
        }
      }
      // Guarantee that the config.xml is saved to disk.
      // Todo: This without dipping into private members.
      GM_config._save(true);
    });

  GM_config.removeObserver(observer);
};
})();

function GM_openUserscriptsOrg(){
  var chromeWin = GM_getBrowserWindow();
  chromeWin.gBrowser.selectedTab = chromeWin.gBrowser.addTab(
      'http://userscripts.org');
}
