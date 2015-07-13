Components.utils.import('chrome://greasemonkey-modules/content/util.js');

var GM_MenuCommander = {
  popup: null,
  cookieShowing: null,
  menuCommands: {},
  messageCookie: 1,
};


GM_MenuCommander.initialize = function() {
  var ppmm = Components
      .classes["@mozilla.org/parentprocessmessagemanager;1"]
      .getService(Components.interfaces.nsIMessageListenerManager);
  ppmm.addMessageListener('greasemonkey:menu-command-response',
      GM_MenuCommander.messageMenuCommandResponse);
};


GM_MenuCommander.commandClicked = function(aCommand) {
  gBrowser.selectedBrowser.messageManager.sendAsyncMessage(
      'greasemonkey:menu-command-run',
      {'cookie': aCommand.cookie});
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

  return menuItem;
};


GM_MenuCommander.messageMenuCommandResponse = function(aMessage) {
  if (aMessage.data.cookie != GM_MenuCommander.cookieShowing) return;

  for (i in aMessage.data.commands) {
    var command = aMessage.data.commands[i];
    var menuItem = GM_MenuCommander.createMenuItem(command);
    GM_MenuCommander.popup.appendChild(menuItem);
  }
};


GM_MenuCommander.onPopupHiding = function() {
  // Asynchronously.  See #1632.
  GM_util.timeout(function() { GM_util.emptyEl(GM_MenuCommander.popup); }, 0);
};


GM_MenuCommander.onPopupShowing = function(aEvent) {
  if (!GM_MenuCommander.popup) {
    GM_MenuCommander.popup = aEvent.target.querySelector(
        'menupopup.greasemonkey-user-script-commands-popup');
  }

  GM_MenuCommander.messageCookie++;
  GM_MenuCommander.cookieShowing = GM_MenuCommander.messageCookie;

  // Start empty ...
  GM_util.emptyEl(GM_MenuCommander.popup);
  // ... ask the selected browser to fill up our menu.
  gBrowser.selectedBrowser.messageManager.sendAsyncMessage(
      'greasemonkey:menu-command-list',
      {'cookie': GM_MenuCommander.cookieShowing});
};
