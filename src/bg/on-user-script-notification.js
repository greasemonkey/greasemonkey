/*
This file is responsible for providing the GM.notification API method.
*/

// Private implementation
(function () {

let portMap = new Map();


function createNotification(details, port) {
  browser.notifications.create({
    type: 'basic',
    title: details.title,
    iconUrl: details.image,
    message: details.text,
  }).then(id => portMap.set(id, port));
}


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
browser.runtime.onConnect.addListener(onUserScriptNotification);


browser.notifications.onClicked.addListener(id => {
  let port = portMap.get(id);
  port.postMessage({type: 'onclick'});
});


browser.notifications.onClosed.addListener(id => {
  let port = portMap.get(id);
  portMap.delete(id);
  port.postMessage({type: 'ondone'});
  port.disconnect();
});

})();
