var GM_MenuCommander = {};

GM_MenuCommander.createMenuItem = function(command) {
  var menuItem = document.createElement("menuitem");
  menuItem._commandFunc = command.commandFunc;
  menuItem.setAttribute("label", command.name);
  menuItem.setAttribute("oncommand", "this._commandFunc()");

  if (command.accessKey) {
    if (typeof(command.accessKey) == "string"
      && command.accessKey.length == 1
    ) {
      menuItem.setAttribute("accesskey", command.accessKey);
    } else {
      GM_logError(new Error('Error with menu command "'
          + command.name + '": accessKey must be a single character'));
    }
  }

  return menuItem;
};

GM_MenuCommander.onPopupShowing = function(aMenuPopup) {
  var allCommands = GM_BrowserUI.gmSvc.menuCommands;

  GM_emptyEl(aMenuPopup);

  // Add menu items for commands for the active window.
  var flag = false;
  for (var i = 0, command = null; command = allCommands[i]; i++) {
    if (command.contentWindow.document == gBrowser.contentDocument) {
      aMenuPopup.appendChild(GM_MenuCommander.createMenuItem(command));
      flag = true;
    }
  }
  if (!flag) {
    var warning = document.createElement("menuitem");
    warning.setAttribute(
        "label", GM_BrowserUI.bundle.getString("menuitem.nocommands"));
    warning.setAttribute("disabled", "true");
    aMenuPopup.appendChild(warning);
  }
};
