/*
TODO: Add observer to put scripts installed, while the addons window is open,
      into the list.
*/

// Override some built-in functions, with a closure reference to the original
// function, to either handle or delegate the call.
(function() {
var _origShowView = showView;
showView = function(aView) {
  if ('userscripts' == aView) {
    greasemonkeyAddons.showView();
  } else {
    _origShowView(aView);
  }
};

var _origBuildContextMenu = buildContextMenu;
buildContextMenu = function(aEvent) {
  if ('userscripts' == gView) {
    greasemonkeyAddons.buildContextMenu(aEvent);
  } else {
    _origBuildContextMenu(aEvent);
  }
};
})();

// Set event listeners.
window.addEventListener('load', function() {
  greasemonkeyAddons.onAddonSelect();
  gExtensionsView.addEventListener('select', greasemonkeyAddons.onAddonSelect, false);
}, false);

var greasemonkeyAddons={
  gmSvc: Components.classes["@greasemonkey.mozdev.org/greasemonkey-service;1"]
                   .getService(Components.interfaces.gmIGreasemonkeyService)
                   .wrappedJSObject,

  showView: function() {
    if ('userscripts' == gView) return;
    updateLastSelected('userscripts');
    gView='userscripts';

    // Update any possibly modified scripts.
    this.gmSvc.config.updateModifiedScripts();

    // Hide the native controls that don't work in the user scripts view.
    function $(id) { return document.getElementById(id); }
    function hide(el) { el=$(el); el && (el.hidden=true); }
    var elementIds=[
      'searchPanel', 'installFileButton', 'checkUpdatesAllButton',
      'skipDialogButton', 'themePreviewArea', 'themeSplitter',
      'showUpdateInfoButton', 'hideUpdateInfoButton',
      'installUpdatesAllButton'];
    elementIds.forEach(hide);

    var getMore = document.getElementById('getMore');
    getMore.setAttribute('getMoreURL', 'http://userscripts.org/');
    getMore.hidden = false;
    getMore.value = 'Get User Scripts';

    greasemonkeyAddons.fillList();
    gExtensionsView.selectedItem = gExtensionsView.children[0];
    // The setTimeout() here is for timing, to make sure the selection above
    // has really happened.
    setTimeout(greasemonkeyAddons.onAddonSelect, 0);
  },

  fillList: function() {
    // I'd much prefer to use the inbuilt templates/rules mechanism that the
    // native FFX bits of this dialog use, but this works as P.O.C.
    var config = GM_getConfig();
    var listbox = gExtensionsView;

    // Remove any pre-existing contents.
    while (listbox.firstChild) {
      listbox.removeChild(listbox.firstChild);
    }

    // Add a list item for each script.
    for (var i = 0, script = null; script = config.scripts[i]; i++) {
      var item = document.createElement('richlistitem');
      item.setAttribute('class', 'userscript');
      // Fake this for now.
      var id = script.namespace + script.name;
      // Setting these attributes inherits the values into the same place they
      // would go for extensions.
      item.setAttribute('addonId', id);
      item.setAttribute('name', script.name);
      item.setAttribute('description', script.description);
      item.setAttribute('id', 'urn:greasemonkey:item:'+id);
      item.setAttribute('isDisabled', !script.enabled);
      // These hide extension-specific bits we don't want to display.
      item.setAttribute('blocklisted', 'false');
      item.setAttribute('blocklistedsoft', 'false');
      item.setAttribute('compatible', 'true');
      item.setAttribute('locked', 'false');
      item.setAttribute('providesUpdatesSecurely', 'true');
      item.setAttribute('satisfiesDependencies', 'true');
      item.setAttribute('type', nsIUpdateItem.TYPE_EXTENSION);

      // Place this item in the container.
      listbox.appendChild(item);
    }
  },

  findSelectedScript: function() {
    if (!gExtensionsView.selectedItem) return null;
    var scripts = GM_getConfig().scripts;
    var selectedScriptId = gExtensionsView.selectedItem.getAttribute('addonId');
    for (var i = 0, script = null; script = scripts[i]; i++) {
      if (selectedScriptId == script.namespace + script.name) {
        return script;
      }
    }
    return null;
  },

  onAddonSelect: function(aEvent) {
    // We do all this work here, because the elements we want to change do
    // not exist until the item is selected.

    if ('userscripts' != gView) return;
    var script = greasemonkeyAddons.findSelectedScript();

    // Remove/change the anonymous nodes we don't want.
    var item = gExtensionsView.selectedItem;
    var button;

    // Replace 'preferences' with 'edit'.
    button = item.ownerDocument.getAnonymousElementByAttribute(
        item, 'command', 'cmd_options');
    if (!button) return;
    button.setAttribute('label', 'Edit');
    button.setAttribute('accesskey', 'E');
    button.setAttribute('command', 'cmd_userscript_edit');
    button.setAttribute('disabled', 'false');

    // Rewire enable, disable, uninstall.
    button = item.ownerDocument.getAnonymousElementByAttribute(
        item, 'command', 'cmd_enable');
    if (!button) return;
    button.setAttribute('command', 'cmd_userscript_enable');
    button.setAttribute('disabled', 'false');

    button = item.ownerDocument.getAnonymousElementByAttribute(
        item, 'command', 'cmd_disable');
    if (!button) return;
    button.setAttribute('command', 'cmd_userscript_disable');
    button.setAttribute('disabled', 'false');

    button = item.ownerDocument.getAnonymousElementByAttribute(
        item, 'command', 'cmd_uninstall');
    if (!button) return;
    button.setAttribute('command', 'cmd_userscript_uninstall');
    button.setAttribute('disabled', 'false');
  },

  doCommand: function(command) {
    var script = greasemonkeyAddons.findSelectedScript();
    if (!script) {
      alert('Crap, something went wrong!');
      return;
    }

    var selectedListitem = gExtensionsView.selectedItem;
    switch (command) {
    case 'cmd_userscript_edit':
      GM_openInEditor(script);
      break;
    case 'cmd_userscript_enable':
      selectedListitem.setAttribute('isDisabled', 'false');
      script.enabled = true;
      break;
    case 'cmd_userscript_disable':
      selectedListitem.setAttribute('isDisabled', 'true');
      script.enabled = false;
      break;
    case 'cmd_userscript_uninstall':
      // todo, make this "true" configurable?
      GM_getConfig().uninstall(script, true);
      selectedListitem.parentNode.removeChild(selectedListitem);
      break;
    }
  },

  buildContextMenu: function(aEvent) {
    var script = greasemonkeyAddons.findSelectedScript();
    if (!script) {
      alert('Crap, something went wrong!');
      return;
    }

    var popup = document.getElementById('addonContextMenu');
    while (popup.hasChildNodes()) {
      popup.removeChild(popup.firstChild);
    }

    function addMenuItem(label, command) {
      var menuitem = document.createElement('menuitem');
      menuitem.setAttribute('label', label);
      menuitem.setAttribute('command', command);
      popup.appendChild(menuitem);
    }

    addMenuItem('Edit', 'cmd_userscript_edit');
    if (script.enabled) {
      addMenuItem('Disable', 'cmd_userscript_disable');
    } else {
      addMenuItem('Enable', 'cmd_userscript_enable');
    }
    addMenuItem('Uninstall', 'cmd_userscript_uninstall');
  }
};
