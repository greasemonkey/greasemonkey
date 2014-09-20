Components.utils.import('resource://greasemonkey/util.js');

var GM_MenuCommander = {};

// Mix in menucommand.js so we don't pollute the global scope
Components.utils.import('resource://greasemonkey/menucommand.js',
    GM_MenuCommander);

GM_MenuCommander.createMenuItem = function(command) {
  var menuItem = document.createElement("menuitem");
  menuItem.setAttribute("label", command.name);
  if ('function' == typeof command.commandFunc) {
    menuItem.addEventListener("command", command.commandFunc, true);
  }

  if (command.accessKey) {
      menuItem.setAttribute("accesskey", command.accessKey);
  }

  return menuItem;
};

GM_MenuCommander.onPageHide = function(aWindowId, aPersisted) {
  if (aPersisted) {
    GM_MenuCommander.withAllMenuCommandsForWindowId(aWindowId,
        function(index, command) { command.frozen = true; });
  } else {
    GM_MenuCommander.removeMatchingMenuCommands(
      null,
      function(index, command) {
        return (
            // Remove the reference if either the window is closed, ...
            GM_util.windowIsClosed(command.contentWindow)
            // ... or the window id of the destroyed page matches.
            || (aWindowId && command.contentWindowId == aWindowId));
      },
      true);  // Don't forget the aForced=true passed here!
  }
}

GM_MenuCommander.onPageShow = function(aWindowId) {
  GM_MenuCommander.withAllMenuCommandsForWindowId(aWindowId,
      function(index, command) { command.frozen = false; });
}

GM_MenuCommander.onPopupHiding = function(aMenuPopup) {
  // Asynchronously.  See #1632.
  GM_util.timeout(function() { GM_util.emptyEl(aMenuPopup); }, 0);
}

GM_MenuCommander.onPopupShowing = function(aMenuPopup) {
  // Add menu items for commands for the active window.
  var haveCommands = false;
  var windowId = GM_util.windowId(gBrowser.contentWindow);

  if (windowId) {
    GM_MenuCommander.withAllMenuCommandsForWindowId(
        windowId,
        function(index, command) {
          if (command.frozen) return;
          aMenuPopup.insertBefore(
              GM_MenuCommander.createMenuItem(command),
              aMenuPopup.firstChild);
          haveCommands = true;
        });
  }

  aMenuPopup.parentNode.disabled = !haveCommands;
};
