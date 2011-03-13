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
      throw "accessKey must be a single character";
    }
  }

  return menuItem;
};

GM_MenuCommander.onPopupShowing = function(aMenuPopup) {
  dump('>>> GM_MenuCommander.onPopupShowing() ...\'n');
  dump(aMenuPopup+'\n');

  var allCommands = GM_BrowserUI.gmSvc.menuCommands;

  // Clean out the popup.
  while (aMenuPopup.firstChild) {
    aMenuPopup.removeChild(aMenuPopup.firstChild);
  }

  // Add menu items for commands for the active window.
  var flag = false;
  for (var i = 0, command = null; command = allCommands[i]; i++) {
    // Firefox 4 must unwrap this document to compare equal.
    if (command.window.document == content.document.wrappedJSObject) {
      aMenuPopup.appendChild(GM_MenuCommander.createMenuItem(command));
      flag = true;
    }
  }
  if (!flag) {
    var warning = document.createElement("menuitem");
    warning.setAttribute(
        "label", GM_BrowserUI.bundle.getString('menuitem.nocommands'));
    warning.setAttribute("disabled", "true");
    aMenuPopup.appendChild(warning);
  }
};
