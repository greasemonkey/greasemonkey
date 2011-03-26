var GM_MenuCommander = {};

GM_MenuCommander.createMenuItem = function(command) {
  var menuItem = document.createElement("menuitem");
  menuItem._commandFunc = command.commandFunc;
  menuItem.setAttribute("key", command.id);
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

GM_MenuCommander.createKey = function(command) {
  var key = document.createElement("key");

  if ((typeof command.accelKey) == "number") {
    key.setAttribute("keycode", command.accelKey);
  } else if ((typeof command.accelKey) == "string"
      && command.accelKey.length == 1
  ) {
    key.setAttribute("key", command.accelKey);
  } else {
    GM_logError(new Error(
        command.script.name + ":\n" +
        "accelKey must be a numerical keycode or a single character"));
  }

  key.setAttribute("modifiers", command.accelModifiers);

  // hack, because listen("oncommand", commandFunc) does not work!
  key._commandFunc = command.commandFunc;
  key.setAttribute("oncommand", "this._commandFunc()");

  key.setAttribute("id", command.id);

  return key;
};

GM_MenuCommander.onPopupShowing = function(aMenuPopup) {
  var allCommands = GM_BrowserUI.gmSvc.menuCommands;

  // Clean out the popup.
  while (aMenuPopup.firstChild) {
    aMenuPopup.removeChild(aMenuPopup.firstChild);
  }

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

GM_MenuCommander.attachKeys = function() {
  GM_MenuCommander.detachKeys();

  var keyset = document.getElementById("userscript-command-keys");
  var gmSvc = GM_BrowserUI.gmSvc;
  for (var i = 0, command = null; command = gmSvc.menuCommands[i]; i++) {
    if (!command.key) continue;
    if (command.contentWindow.document == gBrowser.contentDocument) {
      keyset.appendChild(command.key);
    }
  }
};

GM_MenuCommander.detachKeys = function() {
  var keyset = document.getElementById("userscript-command-keys");
  while (keyset.firstChild) keyset.removeChild(keyset.firstChild);
};
