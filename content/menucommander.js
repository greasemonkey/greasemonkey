Components.utils.import('resource://greasemonkey/util.js');

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

GM_MenuCommander.onPopupHiding = function(aEvent, aMenuPopup) {
  aEvent.stopPropagation();  // Do not bubble event up to containing popup.

  // Asynchronously.  See #1632.
  GM_util.timeout(function() { GM_util.emptyEl(aMenuPopup); }, 0);
}

GM_MenuCommander.onPopupShowing = function(aEvent, aMenuPopup) {
  aEvent.stopPropagation();  // Do not bubble event up to containing popup.

  // Add menu items for commands for the active window.
  var haveCommands = false;
  var windowId = GM_util.windowId(gBrowser.contentWindow);

  if(windowId) {
    GM_BrowserUI.gmSvc.withAllMenuCommandsForWindowId(
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
