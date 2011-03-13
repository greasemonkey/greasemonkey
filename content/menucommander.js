function GM_MenuCommander(menu) {
  this.menu = menu;
  this.keyset = document.getElementById("mainKeyset");
  this.menuPopup = this.menu.firstChild;

  menu.addEventListener(
      'popupshowing', GM_hitch(this, 'onPopupShowing'), false);
}

GM_MenuCommander.prototype.createMenuItem =
function(command) {
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

GM_MenuCommander.prototype.onPopupShowing =
function(aEvent) {
  var allCommands = GM_BrowserUI.gmSvc.menuCommands;

  // Clean out the popup.
  while (this.menuPopup.firstChild) {
    this.menuPopup.removeChild(this.menuPopup.firstChild);
  }

  // Add menu items for commands for the active window.
  var flag = false;
  for (var i = 0, command = null; command = allCommands[i]; i++) {
    // Firefox 4 must unwrap this document to compare equal.
    if (command.window.document == content.document.wrappedJSObject) {
      this.menuPopup.appendChild(this.createMenuItem(command));
      flag = true;
    }
  }
  if (!flag) {
    var warning = document.createElement("menuitem");
    warning.setAttribute(
        "label", GM_BrowserUI.bundle.getString('menuitem.nocommands'));
    warning.setAttribute("disabled", "true");
    this.menuPopup.appendChild(warning);
  }
};
