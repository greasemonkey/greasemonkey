/*
This file is responsible for providing the GM.openInTab API method.
*/

function onApiOpenInTab(message, sender, sendResponse) {
  checkApiCallAllowed('GM.openInTab', message.uuid);
  const senderTab = sender.tab;
  chrome.tabs.create({
    url: message.url,
    active: message.active,
    windowId: senderTab.windowId,
    index: senderTab.index + 1, // next to senderTab
  });
};
