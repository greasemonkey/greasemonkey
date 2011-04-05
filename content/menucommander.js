var GM_MenuCommander = {};

GM_MenuCommander.createMenuItem = function(command) {
  var menuItem = document.createElement("menuitem");
  menuItem.setAttribute("label", command.name);
  menuItem.addEventListener("command", command.commandFunc, true);

  if (command.accessKey) {
      menuItem.setAttribute("accesskey", command.accessKey);
  }

  return menuItem;
};

GM_MenuCommander.onPopupShowing = function(aMenuPopup) {
  GM_emptyEl(aMenuPopup);

  // Add menu items for commands for the active window.
  var flag = false;
  GM_BrowserUI.gmSvc.withAllMenuCommandsForWindowId(
      GM_windowId(gBrowser.contentWindow),
      function(index, command) {
        if (command.frozen) return;
        aMenuPopup.appendChild(GM_MenuCommander.createMenuItem(command));
        flag = true;
      });
  if (!flag) {
    var warning = document.createElement("menuitem");
    warning.setAttribute(
        "label", GM_BrowserUI.bundle.getString("menuitem.nocommands"));
    warning.setAttribute("disabled", "true");
    aMenuPopup.appendChild(warning);
  }
};
