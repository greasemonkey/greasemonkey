/*
This file sets up a message receiver, expecting to receive messages from
content scripts.  It dispatches to global methods registered in other
(background) scripts based on the `name` property of the received message,
and passes all arguments on to that callback.
*/

(function() {
const myPrefix = chrome.runtime.getURL('');

function onMessage(message, sender, sendResponse) {
  if (!message.name) {
    console.error('Background received message without name!', message, sender);
    return;
  }

  // Messages named "Api*" can come from anywhere (i.e. _content_ scripts, where
  // we execute user scripts).  These are handlers for the GM APIs.  Otherwise,
  // only accept messages coming from our own source prefix.
  if (!message.name.startsWith('Api') && !sender.url.startsWith(myPrefix)) {
    throw new Error(
        `ERROR refusing to handle "${message.name}" `
        + `message from sender "${sender.url}".`);
  }

  var cb = window.Message['on' + message.name];
  if (!cb) {
    console.error(
        'Background has no callback for message:', message, 'sender:', sender);
    return;
  }

  return cb(message, sender, sendResponse);
}
window.onMessage = onMessage;
chrome.runtime.onMessage.addListener(onMessage);

})();
