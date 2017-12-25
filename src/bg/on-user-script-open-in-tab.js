/*
This file is responsible for providing the GM.openInTab API method.
*/

(function() {

function onApiOpenInTab(message, sender, sendResponse) {
  const senderTab = sender.tab;
  chrome.tabs.create({
    url: message.url,
    active: message.active,
    windowId: senderTab.windowId,
    index: senderTab.index + 1, // next to senderTab
  });
};
window.Message.onApiOpenInTab = onApiOpenInTab;

})();
