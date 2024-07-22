'use strict';
/*
This file is responsible for providing the GM.openInTab API method.
*/

function onApiOpenInTab(message, sender, sendResponse) {
  checkApiCallAllowed('GM.openInTab', message.uuid);
  let tab = {
    url: message.url,
    active: message.active,
  };
  chrome.runtime.getPlatformInfo(platform => {
    if ('android' != platform.os) {
      // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/Tab#browser_compatibility
      // Firefox for Android does not support `openerTabId`.
      tab.openerTabId = sender.tab.id;
    }
    chrome.tabs.create(tab);
  });
  sendResponse();
}
