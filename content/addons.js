// Globals.
var GM_config = GM_getConfig();
var GM_uninstallQueue = {};
var GM_stringBundle = Components
    .classes["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .createBundle("chrome://greasemonkey/locale/gm-manage.properties");
function GM_string(key) { return GM_stringBundle.GetStringFromName(key); }

(function() {
// Override some built-in functions, with a closure reference to the original
// function, to either handle or delegate the call.
var _origShowView = showView;
showView = function(aView) {
  if ('userscripts' == aView) {
    greasemonkeyAddons.showView();
  } else {
    greasemonkeyAddons.hideView();
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
    // if the currently open tab is not the userscripts tab, then ignore event.
    if (gView != 'userscripts') return;

    if (event == "install") {
      var item = greasemonkeyAddons.addScriptToList(script);
      gExtensionsView.selectedItem = item;
      return;
    }

    // find the script's node in the listbox
    var listbox = gExtensionsView;
    var node = document.getElementById('urn:greasemonkey:item:'+script.id);
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
      case "modified":
        var item = greasemonkeyAddons.listitemForScript(script);
        gExtensionsView.replaceChild(item, node);
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
        function() {
          greasemonkeyAddons.hideView();
          gView = 'userstyles';
        },
        false);
  }
}, false);

window.addEventListener('unload', function() {
  for (var id in GM_uninstallQueue) {
    GM_config.uninstall(GM_uninstallQueue[id]);
    delete(GM_uninstallQueue[id]);
  }
  // Guarantee that the config.xml is saved to disk.
  // Todo: This without dipping into private members.
  GM_config._save(true);
}, false);

var greasemonkeyAddons = {
  hideView: function() {
    if ('userscripts' != gView) return;

    document.documentElement.className = 
      document.documentElement.className.replace(/ *\buserscripts\b/, '');

    // hide the 'New User Script' button
    document.getElementById("new-user-script").hidden = true;
  },

  showView: function() {
    if ('userscripts' == gView) return;

    greasemonkeyAddons.hideView();

    updateLastSelected('userscripts');
    gView='userscripts';
    document.documentElement.className += ' userscripts';

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

    // show the 'New User Script' button
    $("new-user-script").hidden = false;

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
    // Setting these attributes inherits the values into the same place they
    // would go for extensions.
    item.setAttribute('addonId', script.id);
    item.setAttribute('name', script.name);
    item.setAttribute('description', script.description);
    item.setAttribute('version', script.version);
    item.setAttribute('id', 'urn:greasemonkey:item:'+script.id);
    item.setAttribute('isDisabled', !script.enabled);
    // These hide extension-specific bits we don't want to display.
    item.setAttribute('blocklisted', 'false');
    item.setAttribute('blocklistedsoft', 'false');
    item.setAttribute('compatible', 'true');
    item.setAttribute('locked', 'false');
    item.setAttribute('providesUpdatesSecurely', 'true');
    item.setAttribute('satisfiesDependencies', 'true');
    item.setAttribute('type', nsIUpdateItem.TYPE_EXTENSION);

    if (script.id in GM_uninstallQueue) {
      item.setAttribute('opType', 'needs-uninstall');
    }

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
      if (selectedScriptId == script.id) {
        return script;
      }
    }
    return null;
  },

  // Todo: Completely replace this with overlaid XBL, like UninstallCancel.
  onAddonSelect: function(aEvent) {
    // We do all this work here, because the elements we want to change do
    // not exist until the item is selected.

    if (!gExtensionsView.selectedItem) return;
    if ('userscripts' != gView) return;
    var script = greasemonkeyAddons.findSelectedScript();

    // Remove/change the anonymous nodes we don't want.
    var item = gExtensionsView.selectedItem;
    var button;

    // Replace 'preferences' with 'edit'.
    button = item.ownerDocument.getAnonymousElementByAttribute(
        item, 'command', 'cmd_options');
    if (!button) return;
    button.setAttribute('label', GM_string('Edit'));
    button.setAttribute('accesskey', GM_string('Edit.accesskey'));
    button.setAttribute('tooltiptext', GM_string('Edit.tooltip'));
    button.setAttribute('command', 'cmd_userscript_edit');
    button.setAttribute('disabled', 'false');

    // Rewire enable, disable, uninstall.
    button = item.ownerDocument.getAnonymousElementByAttribute(
        item, 'command', 'cmd_enable');
    if (!button) return;
    button.setAttribute('tooltiptext', GM_string('Enable.tooltip'));
    button.setAttribute('command', 'cmd_userscript_enable');
    button.setAttribute('disabled', 'false');

    button = item.ownerDocument.getAnonymousElementByAttribute(
        item, 'command', 'cmd_disable');
    if (!button) return;
    button.setAttribute('tooltiptext', GM_string('Disable.tooltip'));
    button.setAttribute('command', 'cmd_userscript_disable');
    button.setAttribute('disabled', 'false');

    button = item.ownerDocument.getAnonymousElementByAttribute(
        item, 'command', 'cmd_uninstall');
    if (!button) return;
    button.setAttribute('tooltiptext', GM_string('Uninstall.tooltip'));
    button.setAttribute('command', 'cmd_userscript_uninstall');
    button.setAttribute('disabled', 'false');

    button = item.ownerDocument.getAnonymousElementByAttribute(
        item, 'command', 'cmd_cancelUninstall');
    if (!button) return;
    button.setAttribute('tooltiptext', GM_string('UninstallCancel.tooltip'));
    button.setAttribute('command', 'cmd_userscript_uninstall_cancel');
    button.setAttribute('disabled', 'false');
  },

  doCommand: function(command) {
    var script = greasemonkeyAddons.findSelectedScript();
    if (!script) {
      dump("greasemonkeyAddons.doCommand() could not find selected script.\n");
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
      GM_uninstallQueue[script.id] = script;
      // Todo: This without dipping into private members?
      script.needsUninstallEnabled = script._enabled;
      script._enabled = false;
      selectedListitem.setAttribute('opType', 'needs-uninstall');
      break;
    case 'cmd_userscript_uninstall_cancel':
      delete(GM_uninstallQueue[script.id]);
      // Todo: This without dipping into private members?
      script._enabled = script.needsUninstallEnabled;
      delete(script.needsUninstallDisabled);
      selectedListitem.removeAttribute('opType');
      break;
    case 'cmd_userscript_uninstall_now':
      delete(GM_uninstallQueue[script.id]);
      GM_config.uninstall(script);
      break;
    }
  },

  buildContextMenu: function(aEvent) {
    var script = greasemonkeyAddons.findSelectedScript();
    if (!script) {
      dump("greasemonkeyAddons.buildContextMenu() could not find selected script.\n");
      return;
    }

    var selectedItem = gExtensionsView.selectedItem;
    var popup = document.getElementById('addonContextMenu');
    while (popup.hasChildNodes()) {
      popup.removeChild(popup.firstChild);
    }

    function forceDisabled(aEvent) {
      if ('disabled' != aEvent.attrName) return;
      if ('true' == aEvent.newValue) return;
      aEvent.target.setAttribute('disabled', 'true');
    }
    function addMenuItem(label, command, enabled) {
      var menuitem = document.createElement('menuitem');
      menuitem.setAttribute('label', GM_string(label));
      menuitem.setAttribute('accesskey', GM_string(label+'.accesskey'));
      menuitem.setAttribute('command', command);

      if ('undefined' == typeof enabled) enabled = true;
      if (!enabled) {
        menuitem.setAttribute('disabled', 'true');
        // Something is un-setting the disabled attribute.  Work around that,
        // this way for now.
        menuitem.addEventListener('DOMAttrModified', forceDisabled, true);
      }

      popup.appendChild(menuitem);
    }

    if ('needs-uninstall' == selectedItem.getAttribute('opType')) {
      addMenuItem('UninstallCancel', 'cmd_userscript_uninstall_cancel');
      addMenuItem('UninstallNow', 'cmd_userscript_uninstall_now');
    } else {
      addMenuItem('Edit', 'cmd_userscript_edit');
      if (script.enabled) {
        addMenuItem('Disable', 'cmd_userscript_disable');
      } else {
        addMenuItem('Enable', 'cmd_userscript_enable');
      }
      addMenuItem('Uninstall', 'cmd_userscript_uninstall');

      popup.appendChild(document.createElement('menuseparator'));

      addMenuItem('Move Up', 'cmd_userscript_move_up',
          !!selectedItem.previousSibling);
      addMenuItem('Move Down', 'cmd_userscript_move_down',
          !!selectedItem.nextSibling);
      addMenuItem('Move To Top', 'cmd_userscript_move_top',
          !!selectedItem.previousSibling);
      addMenuItem('Move To Bottom', 'cmd_userscript_move_bottom',
          !!selectedItem.nextSibling);

      popup.appendChild(document.createElement('menuseparator'));

      addMenuItem('Sort Scripts', 'cmd_userscript_sort',
          gExtensionsView.itemCount > 1);
    }
  }
};
