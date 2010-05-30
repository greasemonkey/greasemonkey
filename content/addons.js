// Globals.
var GM_config = GM_getConfig();
var GM_uninstallQueue = {};
var gUserscriptsView = null;
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

// Set up an "observer" on the config, to keep the displayed items up to date
// with their actual state.
window.addEventListener("load", function() {
  GM_config.addObserver(observer);
}, false);
window.addEventListener("unload", function() {
  GM_config.removeObserver(observer);
}, false);

var observer = {
  notifyEvent: function(script, event, data) {
    // if the currently open tab is not the userscripts tab, then ignore event.
    if (gView != 'userscripts') return;

    if (event == "install") {
      var item = greasemonkeyAddons.addScriptToList(script);
      gUserscriptsView.selectedItem = item;
      return;
    }

    // find the script's node in the listbox
    var node;
    for (var i = 0; node = gUserscriptsView.childNodes[i]; i++) {
      if (node.getAttribute('addonId') == script.id) {
        break;
      }
    }
    if (!node) return;

    switch (event) {
      case "edit-enabled":
        node.setAttribute('isDisabled', !data);
        break;
      case "uninstall":
        gUserscriptsView.removeChild(node);
        break;
      case "move":
        gUserscriptsView.removeChild(node);
        gUserscriptsView.insertBefore(node, gUserscriptsView.childNodes[data]);
        break;
      case "modified":
        var item = greasemonkeyAddons.listitemForScript(script);
        gUserscriptsView.replaceChild(item, node);
        break;
    }
  }
};
})();

// Set event listeners.
window.addEventListener('load', function() {
  gUserscriptsView = document.getElementById('userscriptsView');
  greasemonkeyAddons.fillList();

  // Work-around for Stylish compatibility, which does not update gView in
  // its overridden showView() function.
  var stylishRadio = document.getElementById('userstyles-view');
  if (stylishRadio) {
    stylishRadio.addEventListener(
        'command',
        function() {
          greasemonkeyAddons.hideView();
          gView = 'userstyles'
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
  showView: function() {
    if ('userscripts' == gView) return;

    updateLastSelected('userscripts');
    gView='userscripts';
    document.documentElement.className += ' userscripts';

    // Update any possibly modified scripts.
    GM_config.updateModifiedScripts();
  },

  hideView: function() {
    if ('userscripts' != gView) return;
    document.documentElement.className = 
      document.documentElement.className.replace(/ *\buserscripts\b/, '');
  },

  fillList: function() {
    // Remove any pre-existing contents.
    while (gUserscriptsView.firstChild) {
      gUserscriptsView.removeChild(gUserscriptsView.firstChild);
    }

    // Add a list item for each script.
    for (var i = 0, script = null; script = GM_config.scripts[i]; i++) {
      greasemonkeyAddons.addScriptToList(script);
    }

    gUserscriptsView.selectedIndex = 0;
  },

  listitemForScript: function(script) {
    var item = document.createElement('richlistitem');

    // Setting these attributes inherits the values into the same place they
    // would go for extensions.
    item.setAttribute('addonId', script.id);
    item.setAttribute('name', script.name);
    item.setAttribute('description', script.description);
    item.setAttribute('version', script.version);
    item.setAttribute('id', 'urn:greasemonkey:item:'+script.id);
    item.setAttribute('isDisabled', !script.enabled);
    if (script.id in GM_uninstallQueue) {
      item.setAttribute('opType', 'needs-uninstall');
    }

    return item;
  },

  addScriptToList: function(script, beforeNode) {
    var item = greasemonkeyAddons.listitemForScript(script);
    gUserscriptsView.insertBefore(item, beforeNode || null);
    return item;
  },

  findSelectedScript: function() {
    if (!gUserscriptsView.selectedItem) return null;
    var scripts = GM_config.scripts;
    var selectedScriptId = gUserscriptsView.selectedItem.getAttribute('addonId');
    for (var i = 0, script = null; script = scripts[i]; i++) {
      if (selectedScriptId == script.id) {
        return script;
      }
    }
    return null;
  },

  doCommand: function(command) {
    var script = greasemonkeyAddons.findSelectedScript();
    if (!script) {
      dump("greasemonkeyAddons.doCommand() could not find selected script.\n");
      return;
    }

    var selectedListitem = gUserscriptsView.selectedItem;
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

    function $(id) { return document.getElementById(id); }
    function setItemsHidden(hidden, idList) {
      if (idList) {
        var items = idList.map(function(id) {
          return $('userscript_context_' + id);
        });
      } else {
        var items = $('userscriptContextMenu').childNodes;
        items = Array.prototype.slice.call(items);
      }
      items.forEach(function(item) {
        item.setAttribute('hidden', hidden);
      });
    }

    var standardItems = [
      'move_up', 'move_down', 'move_top', 'move_bottom', 'sort',
      'move_separator',
      'edit', 'uninstall'];
    var uninstallItems = ['uninstall_now', 'cancelUninstall'];

    // Set everything hidden now, reveal the right selection below.
    setItemsHidden(true);

    var selectedItem = gUserscriptsView.selectedItem;
    if ('needs-uninstall' == selectedItem.getAttribute('opType')) {
      setItemsHidden(false, uninstallItems);
    } else {
      // Set visibility.
      setItemsHidden(false, standardItems);
      setItemsHidden(false, script.enabled ? ['disable'] : ['enable']);
      // Set disabled.
      var atBottom = !selectedItem.nextSibling;
      var atTop = !selectedItem.previousSibling;
      // This setTimeout moves to after whatever black magic is removing
      // these values.
      // Todo: better fix.
      setTimeout(function() {
            setElementDisabledByID('userscript_context_move_up', atTop);
            setElementDisabledByID('userscript_context_move_down', atBottom);
            setElementDisabledByID('userscript_context_move_top', atTop);
            setElementDisabledByID('userscript_context_move_bottom', atBottom);
            setElementDisabledByID('userscript_context_sort', (atTop && atBottom));
          }, 0);
    }
  }
};
