Components.utils.import('chrome://greasemonkey-modules/content/util.js');

var ppmm = Components
    .classes["@mozilla.org/parentprocessmessagemanager;1"]
    .getService(Components.interfaces.nsIMessageListenerManager);

var GM_MenuCommander = {
  popup: null,
  cookieShowing: null,
  menuCommands: {},
  messageCookie: 1,
};


GM_MenuCommander.initialize = function() {
  ppmm.addMessageListener('greasemonkey:menu-command-response',
      GM_MenuCommander.messageMenuCommandResponse);
};


GM_MenuCommander.uninitialize = function() {
  ppmm.removeMessageListener('greasemonkey:menu-command-response',
      GM_MenuCommander.messageMenuCommandResponse);
};


GM_MenuCommander.commandClicked = function(aCommand) {
  gBrowser.selectedBrowser.messageManager.sendAsyncMessage(
      'greasemonkey:menu-command-run',
      {'cookie': aCommand.cookie, 'scriptUuid': aCommand.scriptUuid});
};


GM_MenuCommander.createMenuItem = function(command) {
  var menuItem = document.createElement("menuitem");
  menuItem.setAttribute("label", command.name);
  menuItem.setAttribute("tooltiptext", command.scriptName);
  menuItem.addEventListener("command", function() {
    GM_MenuCommander.commandClicked(command);
  }, false);

  if (command.accessKey) {
      menuItem.setAttribute("accesskey", command.accessKey);
  }

  menuItem.setAttribute("_object", JSON.stringify(command));

  return menuItem;
};


GM_MenuCommander.messageMenuCommandResponse = function(aMessage) {
  if (aMessage.data.cookie != GM_MenuCommander.cookieShowing) return;

  for (var i in aMessage.data.commands) {
    var command = aMessage.data.commands[i];
    var menuItem = GM_MenuCommander.createMenuItem(command);
    var menuItems = GM_MenuCommander.popup.childNodes;
    var menuItemExists = false;
    for (var i = 0, iLen = menuItems.length; i < iLen; i++) {
      if (JSON.stringify(command) == menuItems[i].getAttribute("_object")) {
        menuItemExists = true;
        break;
      }
    }
    if (!menuItemExists) {
      GM_MenuCommander.popup.appendChild(menuItem);
    }
  }
  if (GM_MenuCommander.popup.firstChild) {
    GM_MenuCommander.popup.parentNode.disabled = false;
  }
};


GM_MenuCommander.onPopupHiding = function() {
  // Asynchronously.  See #1632.
  GM_util.timeout(function() { GM_util.emptyEl(GM_MenuCommander.popup); }, 0);
};


GM_MenuCommander.onPopupShowing = function(aEventTarget) {
  GM_MenuCommander.popup = aEventTarget.querySelector(
      'menupopup.greasemonkey-user-script-commands-popup');

  GM_MenuCommander.messageCookie++;
  GM_MenuCommander.cookieShowing = GM_MenuCommander.messageCookie;

  // Start disabled and empty ...
  GM_MenuCommander.popup.parentNode.disabled = true;
  GM_util.emptyEl(GM_MenuCommander.popup);
  // ... ask the selected browser to fill up our menu.
  gBrowser.selectedBrowser.messageManager.sendAsyncMessage(
      'greasemonkey:menu-command-list',
      {'cookie': GM_MenuCommander.cookieShowing});
};
