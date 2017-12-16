/*
This file is responsible for providing the GM.openInTab API method.
*/

function onApiOpenInTab(message, sender, sendResponse) {
  checkApiCallAllowed('GM.openInTab', message.uuid);
  const senderTab = sender.tab;
  const tab = {
    url: message.url,
    active: message.active,
  };
  chrome.runtime.getBrowserInfo(browserInfo => {
    if (browserInfo.name === 'Firefox' && browserInfo.version.split('.')[0] < 57) {
      tab.windowId = senderTab.windowId;
      tab.index = senderTab.index + 1; // next to senderTab
    } else {
      tab.openerTabId = senderTab.id;
    }

    chrome.tabs.create(tab);
  });
};
