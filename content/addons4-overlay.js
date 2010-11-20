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

// \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ //

function addonIsInstalledScript(aAddon) {
  if (!aAddon) return false;
  if ('user-script' != aAddon.type) return false;
  if (aAddon._script.needsUninstall) return false;
  return true;
};

function init() {
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

  var stringBundleService = Components
      .classes['@mozilla.org/intl/stringbundle;1']
      .getService(Ci.nsIStringBundleService);
  var stringBundle = stringBundleService
      .createBundle('chrome://greasemonkey/locale/gm-addons.properties');

  // Inject this content into an XBL binding (where it can't be overlayed).
  sortExecuteOrderButton = document.createElement('button');
  sortExecuteOrderButton.setAttribute('checkState', '0');
  sortExecuteOrderButton.setAttribute('class', 'sorter');
  sortExecuteOrderButton.setAttribute(
      'label', stringBundle.GetStringFromName('executionorder'));
  sortExecuteOrderButton.setAttribute(
      'tooltiptext', stringBundle.GetStringFromName('executionorder.tooltip'));
  sortExecuteOrderButton.collapsed = true;
  sortersContainer = document.getElementById('list-sorters');
  sortersContainer.appendChild(sortExecuteOrderButton);
  sortersContainer.addEventListener('click', onSortersClicked, true);
};

function onContextPopupShowing(aEvent) {
  var popup = aEvent.target;
  var viewIsUserScripts = (
      'addons://list/user-script' == gViewController.currentViewId);
  for (var i = 0, menuitem = null; menuitem = popup.children[i]; i++) {
    var menuitemIsUserScript = ('user-script' == menuitem.getAttribute('type'));
    menuitem.collapsed = viewIsUserScripts != menuitemIsUserScript;
  }
};

function onExecuteSortCommand(aEvent) {
  // Uncheck all sorters.
  var sorters = document.getAnonymousNodes(sortersContainer);
  for (var i=0, el=null; el=sorters[i]; i++) {
    el.setAttribute('checkState', '0');
  }
  // Check our sorter.
  aEvent.target.setAttribute('checkState', 1);
  // Actually sort the elements.
  sortScriptsByExecution();
};

function onSortersClicked(aEvent) {
  if (aEvent.target == sortExecuteOrderButton) {
    onExecuteSortCommand(aEvent);
  } else {
    // When a sorter other than ours is clicked, uncheck ours.
    sortExecuteOrderButton.setAttribute('checkState', 0);
  }
};

function onViewChanged(aEvent) {
  // If we _were_ visible (execute sorter is not collapsed) ...
  if (!sortExecuteOrderButton.collapsed
    // And execute sorter is selected ...
    && (1 == sortExecuteOrderButton.getAttribute('checkState'))
  ) {
    // Deselect us.
    sortExecuteOrderButton.setAttribute('checkState', 0);
    // Select name.
    var sorters = document.getAnonymousNodes(sortersContainer);
    sorters[0].setAttribute('checkState', 1);
    // Sort by name.
    gViewController.currentViewObj.onSortChanged('name', true);
  }
  // Hide the execute order sorter, when the view is not ours.
  sortExecuteOrderButton.collapsed =
      'addons://list/user-script' != gViewController.currentViewId;
};

function sortScriptsByExecution() {
  if (1 != sortExecuteOrderButton.getAttribute('checkState')) {
    return;
  }
  var sortService = Cc["@mozilla.org/xul/xul-sort-service;1"].
    getService(Ci.nsIXULSortService);
  sortService.sort(gListView._listBox, 'executionIndex', 'ascending');
};

function reorderScriptExecution(aAddon, moveBy) {
  GM_getConfig().move(aAddon._script, moveBy);
  AddonManager.getAddonsByTypes(['user-script'], function(aAddons) {
      // Fix all the 'executionOrder' attributes.
      for (var i = 0, addon = null; addon = aAddons[i]; i++) {
        setRichlistitemExecutionIndex(addon);
      }
      // Re-sort the list, with these fixed attributes.
      sortScriptsByExecution();
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
};
})();
