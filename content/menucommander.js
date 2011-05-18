var GM_MenuCommander = {};

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

GM_MenuCommander.onPopupShowing = function(aMenuPopup) {
  GM_emptyEl(aMenuPopup);

  // Add menu items for commands for the active window.
  var haveCommands = false;
  GM_BrowserUI.gmSvc.withAllMenuCommandsForWindowId(
      GM_windowId(gBrowser.contentWindow),
      function(index, command) {
        if (command.frozen) return;
        aMenuPopup.insertBefore(
            GM_MenuCommander.createMenuItem(command),
            aMenuPopup.firstChild);
        haveCommands = true;
      });
  aMenuPopup.parentNode.disabled = !haveCommands;
};
