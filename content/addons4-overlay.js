// This file is concerned with altering the Firefox 4+ Add-ons Manager window,
// for those sorts of functionality we want that the API does not handle.  (As
// opposed to addons4.jsm which is responsible for what the API does handle.)
(function() {
var sortExecuteOrderButton;
window.addEventListener('load', init, false);

function addonIsInstalledScript(aAddon) {
  if (!aAddon) return false;
  if ('user-script' != aAddon.type) return false;
  if (aAddon._script.needsUninstall) return false;
  return true;
}

function init() {
  gViewController.commands.cmd_userscript_edit = {
      isEnabled: addonIsInstalledScript,
      doCommand: function(aAddon) { GM_openInEditor(aAddon._script); }
    };
  gViewController.commands.cmd_userscript_show = {
      isEnabled: addonIsInstalledScript,
      doCommand: function(aAddon) { GM_openFolder(aAddon._script.file); }
    };

  document.getElementById('addonitem-popup').addEventListener(
      'popupshowing', onContextPopupShowing, false);

  // Inject this content into an XBL binding (where it can't be overlayed).
  sortExecuteOrderButton = document.createElement('button');
  sortExecuteOrderButton.setAttribute('checkState', '0');
  sortExecuteOrderButton.setAttribute('class', 'sorter');
  sortExecuteOrderButton.setAttribute('label', 'Execution Order');
  sortExecuteOrderButton.setAttribute('tooltiptext', 'Sort by execution order');
  var sortersContainer = document.getElementById('list-sorters');
  sortersContainer.appendChild(sortExecuteOrderButton);
  sortersContainer.addEventListener('click', onSortersClicked, true);
}

function onContextPopupShowing(aEvent) {
  var popup = aEvent.target;
  var viewIsUserScripts = (
      'addons://list/user-script' == gViewController.currentViewId);
  for (var i = 0, menuitem = null; menuitem = popup.children[i]; i++) {
    var menuitemIsUserScript = ('user-script' == menuitem.getAttribute('type'));
    menuitem.collapsed = viewIsUserScripts != menuitemIsUserScript;
  }
}

function onSortersClicked(aEvent) {
  if (aEvent.target == sortExecuteOrderButton) {
    onExecuteSortCommand(aEvent);
  } else {
    // When a sorter other than ours is clicked, uncheck ours.
    sortExecuteOrderButton.setAttribute('checkState', 0);
  }
}

function onExecuteSortCommand(aEvent) {
  // Uncheck the stock sorters.
  var stockSorters = document.getAnonymousNodes(aEvent.target.parentNode);
  for (var i=0, el=null; el=stockSorters[i]; i++) {
    el.setAttribute('checkState', '0');
  }
  // Check our sorter.
  aEvent.target.setAttribute('checkState', '1');
  // Actually sort the elements.
  var sortService = Cc["@mozilla.org/xul/xul-sort-service;1"].
      getService(Ci.nsIXULSortService);
  sortService.sort(gListView._listBox, 'executionIndex', 'ascending');
}

// Patch the default createItem() to add our custom property.
_createItemOrig = createItem;
createItem = function GM_createItem(aObj, aIsInstall, aIsRemote) {
  var item = _createItemOrig(aObj, aIsInstall, aIsRemote);
  if ('user-script' == aObj.type) {
    item.setAttribute('executionIndex',
        // String format with leading zeros, so it will sort properly.
        ('0000' + aObj.executionIndex).substr(-5));
  }
  return item;
}

})();
