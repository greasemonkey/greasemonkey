// Globals.
var GM_config = GM_getConfig();
var GM_uninstallQueue = {};
var gUserscriptsView = null;

(function() {
// Override some built-in functions, with a closure reference to the original
// function, to either handle or delegate the call.
var _origShowView = showView;
showView = function(aView) {
  if ('userscripts' == aView) {
    greasemonkeyAddons.showView();
  } else {
    greasemonkeyAddons.hideView();

    // Native code will break us, so hide from it before running it.
    if ('userscripts' == gView) gView = null;

    _origShowView(aView);
  }
};

// Set up an "observer" on the config, to keep the displayed items up to date
// with their actual state.
var observer = {
  notifyEvent: function(script, event, data) {
    if (event == "install") {
      var item = greasemonkeyAddons.addScriptToList(script);
      if (gView == "userscripts") gUserscriptsView.selectedItem = item;
      item.setAttribute('newAddon', 'true');
      return;
    }

    // find the script's node
    var node = document.getElementById('urn:greasemonkey:item:'+script.id);
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
        greasemonkeyAddons.reselectLastSelected();
        break;
      case "modified":
        var item = greasemonkeyAddons.listitemForScript(script);
        gUserscriptsView.replaceChild(item, node);
        break;
    }
  }
};

// Set event listeners.
window.addEventListener('load', function() {
  gUserscriptsView = document.getElementById('userscriptsView');
  greasemonkeyAddons.fillList();

  gUserscriptsView.addEventListener(
      'select', greasemonkeyAddons.updateLastSelected, false);
  gUserscriptsView.addEventListener(
      'keypress', greasemonkeyAddons.onKeypress, false);

  window.addEventListener(
      'dragover', greasemonkeyAddons.onDragOver, false);
  window.addEventListener(
      'drop', greasemonkeyAddons.onDrop, false);

  GM_config.addObserver(observer);

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
  GM_config.removeObserver(observer);

  for (var id in GM_uninstallQueue) {
    GM_config.uninstall(GM_uninstallQueue[id]);
    delete(GM_uninstallQueue[id]);
  }
  // Guarantee that the config.xml is saved to disk.
  // Todo: This without dipping into private members.
  GM_config._save(true);
}, false);
})();

var greasemonkeyAddons = {
  showView: function() {
    gUserscriptsView = document.getElementById('userscriptsView');
    if ('userscripts' == gView) return;

    document.getElementById('viewGroup')
        .setAttribute('last-selected', 'userscripts');
    var userscriptsRadio = document.getElementById('userscripts-view');
    var viewGroup = document.getElementById("viewGroup");
    viewGroup.selectedItem = userscriptsRadio;
    greasemonkeyAddons.reselectLastSelected();
    gView='userscripts';
    document.documentElement.className += ' userscripts';

    GM_config.updateModifiedScripts();
    gUserscriptsView.focus();
  },

  hideView: function() {
    if ('userscripts' != gView) return;
    document.documentElement.className =
      document.documentElement.className.replace(/ *\buserscripts\b/g, '');
    gExtensionsView.focus();
  },

  urlFromDragEvent: function(event) {
    var types = event.dataTransfer.types;
    var url = null;
    if (types.contains('text/uri-list')) {
      url = event.dataTransfer.mozGetDataAt('text/uri-list', 0);
    } else if (types.contains('application/x-moz-file')) {
      var file = event.dataTransfer
          .mozGetDataAt('application/x-moz-file', 0)
          .QueryInterface(Components.interfaces.nsIFile);
      url = GM_getUriFromFile(file).spec;
    }
    return url;
  },

  onDragOver: function(event) {
    var url = greasemonkeyAddons.urlFromDragEvent(event);
    if (url && url.match(/\.user\.js$/)) {
      // Cancel the default do-not-allow behavior.
      event.preventDefault();
    }
  },

  onDrop: function(event) {
    var uri = GM_uriFromUrl(greasemonkeyAddons.urlFromDragEvent(event));
    // TODO: Make this UI appear attached to addons, rather than the browser?
    GM_installUri(uri);
  },
  
  updateLastSelected: function() {
    if (!gUserscriptsView.selectedItem) return;
    var userscriptsRadio = document.getElementById('userscripts-view');
    var selectedId = gUserscriptsView.selectedItem.getAttribute('id');
    if (selectedId) {
      userscriptsRadio.setAttribute('last-selected', selectedId);
    }
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

    greasemonkeyAddons.reselectLastSelected();
  },

  reselectLastSelected: function() {
    if (!gUserscriptsView) return;

    var userscriptsRadio = document.getElementById('userscripts-view');
    var lastId = userscriptsRadio.getAttribute('last-selected');

    // I have no idea why, but this setTimeout makes it work.
    setTimeout(function() {
          if ('userscripts' == gView) {
            if (lastId) {
              gUserscriptsView.selectedItem = document.getElementById(lastId);
            }
            if (gUserscriptsView.selectedItem) {
              gUserscriptsView.scrollBoxObject
                  .scrollToElement(gUserscriptsView.selectedItem);
            }
          }
        }, 0);
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
    case 'cmd_userscript_show':
      GM_openFolder(script._file);
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
      function scriptCmp(a, b) {
        return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
      }
      GM_config._scripts.sort(scriptCmp);
      GM_config._save();
      greasemonkeyAddons.fillList();
      greasemonkeyAddons.reselectLastSelected();
      break;
    case 'cmd_userscript_uninstall':
      GM_uninstallQueue[script.id] = script;
      script.needsUninstall = true;
      selectedListitem.setAttribute('opType', 'needs-uninstall');
      break;
    case 'cmd_userscript_uninstall_cancel':
      delete(GM_uninstallQueue[script.id]);
      script.needsUninstall = false;
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
      'edit', 'show',
      'edit_separator',
      'uninstall'];
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
  },

  onKeypress: function(aEvent) {
    var viewGroup = document.getElementById("viewGroup");
    switch (aEvent.keyCode) {
      case aEvent.DOM_VK_LEFT:
      case aEvent.DOM_VK_RIGHT:
        let nextFlag = (aEvent.keyCode == aEvent.DOM_VK_RIGHT);
        if (getComputedStyle(viewGroup, "").direction == "rtl")
          nextFlag = !nextFlag;
        viewGroup.checkAdjacentElement(nextFlag);
        break;
      default:
        return; // don't consume the event
    }
    aEvent.stopPropagation();
    aEvent.preventDefault();
  }
};
