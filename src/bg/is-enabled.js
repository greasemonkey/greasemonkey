/*
This file is responsible for tracking and exposing the global "enabled" state
of Greasemonkey.
*/

// Private implementation.
(function() {

let isEnabled = true;
chrome.storage.local.get('globalEnabled', v => {
  isEnabled = v['globalEnabled'];
  setIcon();
});


function getGlobalEnabled() {
  return !!isEnabled;
}
window.getGlobalEnabled = getGlobalEnabled;


function onEnabledQuery(message, sender, sendResponse) {
  sendResponse(isEnabled);
}
window.Message.onEnabledQuery = onEnabledQuery;


function setGlobalEnabled(enabled) {
  isEnabled = !!enabled;
  setIcon();
  chrome.storage.local.set({'globalEnabled': enabled});
}
window.setGlobalEnabled = setGlobalEnabled;


function onEnabledSet(message, sender, sendResponse) {
  setGlobalEnabled(message.enabled);
}
window.Message.onEnabledSet = onEnabledSet;


function setIcon() {
  // Firefox for Android does not have setIcon
  // https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/browserAction/setIcon#Browser_compatibility
  if (chrome.browserAction.setIcon) {
    chrome.browserAction.setIcon({
      'path': 'skin/icon32' + (isEnabled ? '' : '-disabled') + '.png',
    });
  }
}


function toggleGlobalEnabled() {
  setGlobalEnabled(!isEnabled);
}
window.toggleGlobalEnabled = toggleGlobalEnabled;


function onEnabledToggle(message, sender, sendResponse) {
  try {
  console.log('got enabled toggle', message, sender);
  toggleGlobalEnabled();
  sendResponse(isEnabled);
  } catch (e) { console.error(e); }
}
window.Message.onEnabledToggle = onEnabledToggle;

})();
