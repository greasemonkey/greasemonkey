// Globals.
var GM_config = GM_getConfig();

(function() {
// Override some built-in functions, with a closure reference to the original
// function, to either handle or delegate the call.
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

// Set up an "observer" on the config, to keep the displayed items up to date
// with their actual state.
var config = GM_config;
window.addEventListener("load", function() {
  config.addObserver(observer);
}, false);
window.addEventListener("unload", function() {
  config.removeObserver(observer);
}, false);

var observer = {
  notifyEvent: function(script, event, data) {
    if (event == "install") {
      var item = greasemonkeyAddons.addScriptToList(script);
      gExtensionsView.selectedItem = item;
      return;
    }

    var listbox = gExtensionsView;
    var node;
    var scriptId = script.namespace + script.name;
    for (var i = 0; node = listbox.childNodes[i]; i++) {
      if (node.getAttribute('addonId') == scriptId) {
        break;
      }
    }
    if (!node) return;

    switch (event) {
      case "edit-enabled":
        node.setAttribute('isDisabled', !data);
        break;
      case "uninstall":
        listbox.removeChild(node);
        break;
      case "move":
        listbox.removeChild(node);
        listbox.insertBefore(node, listbox.childNodes[data]);
        break;
    }
  }
};
})();

// Set event listeners.
window.addEventListener('load', function() {
  greasemonkeyAddons.onAddonSelect();
  gExtensionsView.addEventListener(
      'select', greasemonkeyAddons.onAddonSelect, false);

  // Work-around for Stylish compatibility, which does not update gView in
  // its overridden showView() function.
  var stylishRadio = document.getElementById('userstyles-view');
  if (stylishRadio) {
    stylishRadio.addEventListener(
        'command',
        function() { gView = 'userstyles' },
        false);
  }
}, false);

var greasemonkeyAddons = {
  showView: function() {
    if ('userscripts' == gView) return;
    updateLastSelected('userscripts');
    gView='userscripts';

    // Update any possibly modified scripts.
    GM_config.updateModifiedScripts();

    // Hide the native controls that don't work in the user scripts view.
    function $(id) { return document.getElementById(id); }
    function hide(el) { el=$(el); el && (el.hidden=true); }
    var elementIds=[
      'searchPanel', 'installFileButton', 'checkUpdatesAllButton',
      'skipDialogButton', 'themePreviewArea', 'themeSplitter',
      'showUpdateInfoButton', 'hideUpdateInfoButton',
      'installUpdatesAllButton',
      // Stylish injects these elements.
      'copy-style-info', 'new-style'];
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
    var config = GM_config;
    var listbox = gExtensionsView;

    // Remove any pre-existing contents.
    while (listbox.firstChild) {
      listbox.removeChild(listbox.firstChild);
    }

    // Add a list item for each script.
    for (var i = 0, script = null; script = config.scripts[i]; i++) {
      greasemonkeyAddons.addScriptToList(script);
    }
  },

  listitemForScript: function(script) {
    var item = document.createElement('richlistitem');
    item.setAttribute('class', 'userscript');
    // Fake this for now.
    var id = script.namespace + script.name;
    // Setting these attributes inherits the values into the same place they
    // would go for extensions.
    item.setAttribute('addonId', id);
    item.setAttribute('name', script.name);
    item.setAttribute('description', script.description);
    if (script.icon && script.icon.fileURL) {
      item.setAttribute('iconURL', script.icon.fileURL);
    } else {
      item.setAttribute('iconURL', "chrome://greasemonkey/skin/userscript.png");
    }
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
    return item;
  },

  addScriptToList: function(script, beforeNode) {
    var item = greasemonkeyAddons.listitemForScript(script);
    gExtensionsView.insertBefore(item, beforeNode || null);
    return item;
  },

  findSelectedScript: function() {
    if (!gExtensionsView.selectedItem) return null;
    var scripts = GM_config.scripts;
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
    button.setAttribute('tooltiptext', 'Edit the selected User Script');
    button.setAttribute('command', 'cmd_userscript_edit');
    button.setAttribute('disabled', 'false');

    // Rewire enable, disable, uninstall.
    button = item.ownerDocument.getAnonymousElementByAttribute(
        item, 'command', 'cmd_enable');
    if (!button) return;
    button.setAttribute('tooltiptext', 'Enable the selected User Script');
    button.setAttribute('command', 'cmd_userscript_enable');
    button.setAttribute('disabled', 'false');

    button = item.ownerDocument.getAnonymousElementByAttribute(
        item, 'command', 'cmd_disable');
    if (!button) return;
    button.setAttribute('tooltiptext', 'Disable the selected User Script');
    button.setAttribute('command', 'cmd_userscript_disable');
    button.setAttribute('disabled', 'false');

    button = item.ownerDocument.getAnonymousElementByAttribute(
        item, 'command', 'cmd_uninstall');
    if (!button) return;
    button.setAttribute('tooltiptext', 'Uninstall the selected User Script');
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
      script.enabled = true;
      break;
    case 'cmd_userscript_disable':
      script.enabled = false;
      break;
    case 'cmd_userscript_move_down':
      GM_config.move(script, 1);
      break;
    case 'cmd_userscript_move_bottom':
      GM_config.move(script, GM_config.scripts.length);
      break;
    case 'cmd_userscript_move_up':
      GM_config.move(script, -1);
      break;
    case 'cmd_userscript_move_top':
      GM_config.move(script, -1 * GM_config.scripts.length);
      break;
    case 'cmd_userscript_sort':
      function scriptCmp(a, b) { return a.name < b.name ? -1 : 1; }
      GM_config._scripts.sort(scriptCmp);
      GM_config._save();
      greasemonkeyAddons.fillList();
      break;
    case 'cmd_userscript_uninstall':
      GM_config.uninstall(script);
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

    popup.appendChild(document.createElement('menuseparator'));

    addMenuItem('Move Up', 'cmd_userscript_move_up');
    addMenuItem('Move Down', 'cmd_userscript_move_down');
    addMenuItem('Move To Top', 'cmd_userscript_move_top');
    addMenuItem('Move To Bottom', 'cmd_userscript_move_bottom');

    popup.appendChild(document.createElement('menuseparator'));

    addMenuItem('Sort Scripts', 'cmd_userscript_sort');
  }
};
