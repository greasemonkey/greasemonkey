/*
This file sets up a message receiver, expecting to receive messages from
content scripts.  It dispatches to global methods registered in other
(background) scripts based on the `name` property of the received message,
and passes all arguments on to that callback.
*/
browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (!message.name) {
    console.error('Background received message without name!', message, sender);
    return;
  }

  var cb = window['on' + message.name];
  if (!cb) {
    console.error(
        'Background has no callback for message:', message, 'sender:', sender);
    return;
  }

  cb(message, sender, sendResponse);
});
