/*
This file is responsible for providing the GM.notification API method.
*/

// Private implementation
(function () {

let portMap = new Map();

function onUserScriptNotification(port) {
  if (port.name != 'UserScriptNotification') return;

  port.onMessage.addListener(msg => {
    switch (msg.name) {
      case 'create':
        createNotification(msg.details, port);
        break;
      default:
        console.warn('UserScriptNotification port un-handled message name:', msg.name);
    }
  });
}

function createNotification(details, port) {
  chrome.notifications.create({
    type: 'basic',
    title: details.title,
    iconUrl: details.image,
    message: details.text,
  }, id => {
    portMap.set(id, port);
  });
}

chrome.runtime.onConnect.addListener(onUserScriptNotification);

chrome.notifications.onClicked.addListener(id => {
  let port = portMap.get(id);
  port.postMessage({type: 'onclick'});
});

chrome.notifications.onClosed.addListener(id => {
  let port = portMap.get(id);
  portMap.delete(id);
  port.postMessage({type: 'ondone'});
  port.disconnect();
});

})();
