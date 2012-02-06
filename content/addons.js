Components.utils.import('resource://greasemonkey/util.js');

// Globals.
var GM_config = GM_util.getService().config;
var GM_uninstallQueue = {};
var gUserscriptsView = null;

var GM_os;
(function() {
var xulRuntime = Components
    .classes['@mozilla.org/xre/app-info;1']
    .getService(Components.interfaces.nsIXULRuntime);

GM_os = xulRuntime.OS;
})();

(function private_scope() {
var _origShowView;
function ourShowView(aView) {
  if ('userscripts' == aView) {
    greasemonkeyAddons.showView();
  } else {
    greasemonkeyAddons.hideView();

    // Native code will break us, so hide from it before running it.
    if ('userscripts' == gView) gView = null;

    _origShowView(aView);

    if ('updates' == aView) greasemonkeyAddons.showScriptUpdates();
  }
};
window.GM_overrideShowView = function() {
  if (showView != ourShowView) {
    _origShowView = showView;
    showView = ourShowView;
  }
};
GM_overrideShowView();

var _origInstallUpdates = installUpdatesAll;
installUpdatesAll = function() {
  var chromeWin = GM_util.getBrowserWindow();
  var children = gExtensionsView.children;
  for (var i = 0, child = null; child = children[i]; i++) {
    if (!/^urn:greasemonkey:update:item:/.test(child.id)) continue;

    var checkbox = document.getAnonymousElementByAttribute(
        child, 'anonid', 'includeUpdate');
    if (!checkbox) continue;

    checkbox.setAttribute('anonid', 'includeScriptUpdate');
    if (checkbox.checked) {
      var script = GM_config.getScriptById(child.getAttribute('addonId'));
      script.installUpdate(chromeWin);
    }
  }

  _origInstallUpdates();
};

var _origBuildContextMenu = buildContextMenu;
buildContextMenu = function(event) {
  _origBuildContextMenu(event);

  var selectedItem = gExtensionsView.selectedItem;
  if (/^urn:greasemonkey:update:item:/.test(selectedItem.id)) {
    document.getElementById('menuitem_homepage_clone')
        .setAttribute('hidden', true);
    document.getElementById('menuitem_about_clone')
        .setAttribute('hidden', true);
    document.getElementById('menuseparator_1_clone')
        .setAttribute('hidden', true);
    document.getElementById('menuitem_installUpdate_clone')
        .setAttribute('command', 'cmd_userscript_installUpdate');
  } else {
    document.getElementById('menuitem_installUpdate')
        .setAttribute('command', 'cmd_installUpdate');
  }
};

// Set up an 'observer' on the config, to keep the displayed items up to date
// with their actual state.
var observer = {
  notifyEvent: function(script, event, data, aView) {
    if ('undefined' == typeof aView) var aView = gView;

    var currentViewNode = null;
    if ('updates' == aView) {
      currentViewNode = gExtensionsView;
      this.notifyEvent(script, event, data, 'userscripts');
    } else if ('userscripts' == aView) {
      currentViewNode = gUserscriptsView;
    }

    if ('userscripts' == aView && 'install' == event) {
      var beforeNode = data > -1 ? currentViewNode.childNodes[data] : null;
      var item = greasemonkeyAddons.listitemForScript(script);
      item.setAttribute('newAddon', 'true');
      currentViewNode.insertBefore(item, beforeNode);
      if ('userscripts' == gView) gUserscriptsView.selectedItem = item;
      return;
    } else if ('updates' == aView && 'install' == event) {
      var node = document.getElementById('urn:greasemonkey:'
          + (aView == 'updates' ? 'update:' : '') + 'item:' + script.id);
      if (node) currentViewNode.removeChild(node);
      if (currentViewNode.children.length == 0) {
        showView('userscripts');
        document.getElementById('updates-view').hidden = true;
      }
      return;
    } else if ('updates' == aView && 'update-found' == event) {
      var node = greasemonkeyAddons.listitemForScript(script, true);
      node.setAttribute('typeName', 'update');
      currentViewNode.insertBefore(node, null);
    }

    var node = document.getElementById('urn:greasemonkey:'
        + (aView == 'updates' ? 'update:' : '') + 'item:' + script.id);
    if (!node || !currentViewNode) return;

    switch (event) {
      case 'edit-enabled':
        node.setAttribute('isDisabled', !data);
        break;
      case 'update-found':
        node.setAttribute('updateable', 'true');
        node.setAttribute('availableUpdateVersion', data.version);
        node.setAttribute('availableUpdateURL', data.url);
        node.setAttribute('providesUpdatesSecurely', data.secure.toString());
        node.setAttribute('updateAvailableMsg',
            'Version ' + data.version + ' is available.');
        document.getElementById('updates-view').hidden = false;
        showView('updates');
        break;
      case 'uninstall':
        currentViewNode.removeChild(node);
        break;
      case 'move':
        gUserscriptsView.removeChild(node);
        gUserscriptsView.insertBefore(node, gUserscriptsView.childNodes[data]);
        greasemonkeyAddons.reselectLastSelected();
        break;
      case 'modified':
        var item = greasemonkeyAddons.listitemForScript(
            script, 'updates' == aView);
        currentViewNode.replaceChild(item, node);
        break;
    }
  }
};

// Set event listeners.
window.addEventListener('load', function() {
  gUserscriptsView = document.getElementById('userscriptsView');
  greasemonkeyAddons.fillList();
  greasemonkeyAddons.fixButtonOrder();

  gUserscriptsView.addEventListener(
      'select', greasemonkeyAddons.updateLastSelected, false);
  gUserscriptsView.addEventListener(
      'keypress', greasemonkeyAddons.onKeypress, false);

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

  // Work-around for Personas Plus compatibility.  They're super dirty with
  // the showView() method, and they break us.  Guarantee our version is used
  // (because we're responsible enough to still call them).
  if ('undefined' != typeof DEFAULT_PERSONA_ID) {
    GM_overrideShowView();
    if ('userscripts' == gView) {
      GM_util.logError(new Error(
          'Warning: the Personas Plus extension is incompatible with'
          +' Greasemonkey.\nIt is not required to use personas; you are advised'
          +' to uninstall it.'));
      // Since we (probably?) loaded with Persona's broken-for-us showView(),
      // switch away and back so user scripts will show up.
      showView('extensions');
      setTimeout(showView, 0, 'userscripts');
    }
  }

  var scripts = GM_config.getMatchingScripts(
      function (script) { return script.updateAvailable; });
  if (scripts.length > 0) {
    document.getElementById('updates-view').hidden = false;
  }

  var contextMenu = document.getElementById("userscriptContextMenu");
  contextMenu.addEventListener(
      "popupshowing", greasemonkeyAddons.onContextShowing, false);
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
    var viewGroup = document.getElementById('viewGroup');
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

  showScriptUpdates: function() {
    var scripts = GM_config.getMatchingScripts(
        function (script) { return script.updateAvailable; });

    // Add a list item for each script.
    for (var i = 0, script = null; script = scripts[i]; i++) {
      var item = greasemonkeyAddons.listitemForScript(script, true);
      item.setAttribute('typeName', 'update');
      gExtensionsView.insertBefore(item, null);
    }
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
    GM_util.emptyEl(gUserscriptsView);

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

  listitemForScript: function(script, updateView) {
    var item = document.createElement('richlistitem');

    // Setting these attributes inherits the values into the same place they
    // would go for extensions.
    item.setAttribute('addonId', script.id);
    item.setAttribute('name', script.name);
    item.setAttribute('description', script.description);
    item.setAttribute('version', script.version);
    item.setAttribute('iconURL', script.icon.fileURL);
    item.setAttribute('id', 'urn:greasemonkey:'
        + (updateView ? 'update:' : '') + 'item:' + script.id);
    item.setAttribute('isDisabled', !script.enabled);

    if (script.updateAvailable) {
      item.setAttribute('updateable', 'true');
      item.setAttribute('availableUpdateVersion', script._updateVersion);
      item.setAttribute('availableUpdateURL', script._downloadURL);
      item.setAttribute('satisfiesDependencies', 'true');
      item.setAttribute('updateAvailableMsg',
          'Version ' + script._updateVersion + ' is available.');
      item.setAttribute('providesUpdatesSecurely', script.updateIsSecure);
    }

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
    var currentViewNode = null;
    if ('updates' == gView) {
      currentViewNode = gExtensionsView;
    } else if ('userscripts' == gView) {
      currentViewNode = gUserscriptsView;
    }
    if (!currentViewNode || !currentViewNode.selectedItem) return null;
    var selectedScriptId = currentViewNode.selectedItem.getAttribute('addonId');
    return GM_config.getScriptById(selectedScriptId) || null;
  },

  doCommand: function(command) {
    var script = greasemonkeyAddons.findSelectedScript();
    if (!script) {
      dump('greasemonkeyAddons.doCommand() could not find selected script.\n');
      return;
    }

    var currentViewNode = null;
    if ('updates' == gView) {
      currentViewNode = gExtensionsView;
    } else if ('userscripts' == gView) {
      currentViewNode = gUserscriptsView;
    }

    var selectedListitem = currentViewNode.selectedItem;
    switch (command) {
    case 'cmd_userscript_edit':
      GM_util.openInEditor(script);
      break;
    case 'cmd_userscript_options':
      openDialog('chrome://greasemonkey/content/scriptprefs.xul#' + script.id);
      break;
    case 'cmd_userscript_show':
      GM_openFolder(script.file);
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
    case 'cmd_userscript_checkUpdate':
      script.checkForRemoteUpdate(true);
      break;
    case 'cmd_userscript_installUpdate':
      script.installUpdate(GM_util.getBrowserWindow());
      break;
    case 'cmd_userscript_toggleCheckUpdates':
      script.checkRemoteUpdates = !script.checkRemoteUpdates;
      GM_util.getService().config._changed(script, "modified", null);
      break;
    }
  },

  buildContextMenu: function(aEvent) {
    var script = greasemonkeyAddons.findSelectedScript();
    if (!script) {
      dump('greasemonkeyAddons.buildContextMenu() could not find selected script.\n');
      return;
    }

    function $(id) { return document.getElementById(id); }
    function setItemsHidden(hidden, idList) {
      var items;
      if (idList) {
        items = idList.map(function(id) {
          return $('userscript_context_' + id);
        });
      } else {
        items = Array.prototype.slice.call(
            $('userscriptContextMenu').childNodes);
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
        'uninstall', 'toggleCheckUpdates'];
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
      setItemsHidden(script.updateAvailable, ['checkUpdate']);
      setItemsHidden(!script.updateAvailable, ['installUpdate']);
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

  onContextShowing: function(aEvent) {
    var script = greasemonkeyAddons.findSelectedScript();
    var menuitem = document.getElementById(
        'userscript_context_toggleCheckUpdates');
    if (script.checkRemoteUpdates) {
      menuitem.setAttribute('checked', 'true');
    } else {
      menuitem.removeAttribute('checked');
    }
  },

  onKeypress: function(aEvent) {
    var viewGroup = document.getElementById('viewGroup');
    switch (aEvent.keyCode) {
      case aEvent.DOM_VK_LEFT:
      case aEvent.DOM_VK_RIGHT:
        var nextFlag = (aEvent.keyCode == aEvent.DOM_VK_RIGHT);
        if ('rtl' == getComputedStyle(viewGroup, '').direction) {
          nextFlag = !nextFlag;
        }
        viewGroup.checkAdjacentElement(nextFlag);
        break;
      default:
        return; // don't consume the event
    }
    aEvent.stopPropagation();
    aEvent.preventDefault();
  },

  // See: http://github.com/greasemonkey/greasemonkey/issues/#issue/1149
  // Since every Firefox version/platform has a different order of controls
  // in this dialog, rearrange ours to blend in with that scheme.
  fixButtonOrder: function() {
    function $(id) { return document.getElementById(id); }

    if ('WINNT' != GM_os) {
      $('commandBarBottom').insertBefore(
          $('newUserscript'), $('skipDialogButton'));
    }
  }
};

// See: https://developer.mozilla.org/en/drag_and_drop_javascript_wrapper
var greasemonkeyDragObserver = {
  onDragOver: function(event, flavor, session) {
    // no-op
  },
  onDrop: function(event, dropData, session) {
    var url = null;
    if ('text/uri-list' == dropData.flavour.contentType) {
      url = dropData.data;
    } else if ('application/x-moz-file' == dropData.flavour.contentType) {
      url = GM_util.getUriFromFile(dropData.data).spec;
    }
    if (url && url.match(/\.user\.js$/)) {
      GM_util.showInstallDialog(
          url, GM_util.getBrowserWindow().gBrowser, GM_util.getService());
    }
  },
  getSupportedFlavours: function() {
    var flavours = new FlavourSet();
    flavours.appendFlavour('application/x-moz-file', 'nsIFile');
    flavours.appendFlavour('text/uri-list');
    return flavours;
  }
};
