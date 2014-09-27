Components.utils.import('resource://greasemonkey/util.js');

var GM_MenuCommander = {
  menuCommands: {}
};

GM_MenuCommander.initialize = function() {
  var messageManager = Components.classes["@mozilla.org/globalmessagemanager;1"]
      .getService(Components.interfaces.nsIMessageListenerManager);

  messageManager.addMessageListener('greasemonkey:menu-command-registered',
      GM_MenuCommander.menuCommandRegistered);
  messageManager.addMessageListener('greasemonkey:clear-menu-commands',
      GM_MenuCommander.clearMenuCommands);
  messageManager.addMessageListener('greasemonkey:toggle-menu-commands',
      GM_MenuCommander.toggleMenuCommands);
}

GM_MenuCommander.menuCommandRegistered = function(aMessage) {
  var windowId = aMessage.data.windowId;

  if (!GM_MenuCommander.menuCommands[windowId]) {
    GM_MenuCommander.menuCommands[windowId] = [];
  }

  var command = aMessage.data;
  command.browser = aMessage.target;
  GM_MenuCommander.menuCommands[windowId].push(command);
}

GM_MenuCommander.clearMenuCommands = function(aMessage) {
  var windowId = aMessage.data.windowId;
  if (!windowId) return;

  delete GM_MenuCommander.menuCommands[windowId];
}

GM_MenuCommander.toggleMenuCommands = function(aMessage) {
  var frozen = aMessage.data.frozen;
  var windowId = aMessage.data.windowId;

  GM_MenuCommander.withAllMenuCommandsForWindowId(windowId, function(command) {
    command.frozen = frozen;
  });
}

GM_MenuCommander.commandClicked = function(aCommand) {
  aCommand.browser.messageManager.sendAsyncMessage("greasemonkey:menu-command-clicked", {
    index: aCommand.index,
    windowId: aCommand.windowId
  });
}

GM_MenuCommander.createMenuItem = function(command) {
  var menuItem = document.createElement("menuitem");
  menuItem.setAttribute("label", command.name);
  menuItem.addEventListener("command", function() {
    GM_MenuCommander.commandClicked(command);
  }, false);

  if (command.accessKey) {
      menuItem.setAttribute("accesskey", command.accessKey);
  }

  return menuItem;
};

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

GM_MenuCommander.withAllMenuCommandsForWindowId = function(
    aContentWindowId, aCallback) {
  if (!aContentWindowId) return;

  var commands = GM_MenuCommander.menuCommands[aContentWindowId];
  if (!commands) return;

  var l = commands.length - 1;
  for (var i = l, command = null; command = commands[i]; i--) {
    aCallback(i, command);
  }
};
