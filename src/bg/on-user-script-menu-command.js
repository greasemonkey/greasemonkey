'use strict';
/*
This file is responsible for providing the GM.registerMenuCommand API method.
*/

// Private implementation
(function () {

const commandMap = new Map();


function _randomId() {
  return 'id' + window.crypto.getRandomValues(new Uint8Array(16)).join('');
}


function onListMenuCommands(message, sender, sendResponse) {
  sendResponse(
      Array.from(commandMap.values())
          .filter(command => command.port.sender.tab.id === message.tabId)
          .map(command => ({
            id: command.id,
            caption: command.caption,
            accessKey: command.accessKey,
            icon: command.icon,
          })));
}
window.onListMenuCommands = onListMenuCommands;


function onMenuCommandClick(message, sender, sendResponse) {
  if (commandMap.has(message.id)) {
    commandMap.get(message.id).port.postMessage({type: 'onclick'});
  }
}
window.onMenuCommandClick = onMenuCommandClick;


function registerMenuCommand({port, caption, accessKey, uuid}) {
  const command = {
    id: _randomId(),
    port,
    caption,
    accessKey,
    icon: iconUrl(UserScriptRegistry.scriptByUuid(uuid)),
  };

  commandMap.set(command.id, command);

  port.onDisconnect.addListener(port => {
    commandMap.delete(command.id);
  });
}


function onUserScriptMenuCommand(port) {
  if (port.name != 'UserScriptMenuCommand') return;

  port.onMessage.addListener((msg, port) => {
    checkApiCallAllowed('GM.registerMenuCommand', msg.uuid);
    switch (msg.name) {
      case 'register':
        registerMenuCommand(Object.assign({
          port,
          uuid: msg.uuid,
        }, msg.details));
        break;
      default:
        console.warn('UserScriptMenuCommand port un-handled message name:', msg.name);
    }
  });
}
chrome.runtime.onConnect.addListener(onUserScriptMenuCommand);

})();
