/*
This file is responsible for tracking and exposing the global "enabled" state
of Greasemonkey.
*/

// Private implementation.
(function() {

let isEnabled = true;


function getGlobalEnabled() {
  return !!isEnabled;
}
window.getGlobalEnabled = getGlobalEnabled;


function onEnabledQuery(message, sender, sendResponse) {
  sendResponse(isEnabled);
}
window.onEnabledQuery = onEnabledQuery;


function setGlobalEnabled(enabled) {
  isEnabled = !!enabled;
  chrome.runtime.sendMessage({
    'name': 'EnabledChanged',
    'enabled': isEnabled,
  });
  setIcon();
}
window.setGlobalEnabled = setGlobalEnabled;
function onEnabledSet(message, sender, sendResponse) {
  setGlobalEnabled(message.enabled);
}
window.onEnabledSet = onEnabledSet;


function setIcon() {
  chrome.browserAction.setIcon({
    'path': 'skin/icon32' + (isEnabled ? '' : '-disabled') + '.png',
  });
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
window.onEnabledToggle = onEnabledToggle;

})();
