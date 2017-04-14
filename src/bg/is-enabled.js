/*
This file is responsible for tracking and exposing the global "enabled" state
of Webbymonkey.
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
  browser.runtime.sendMessage({
    'name': 'EnabledChanged',
    'enabled': isEnabled,
  });
}
window.setGlobalEnabled = setGlobalEnabled;
function onEnabledSet(message, sender, sendResponse) {
  setGlobalEnabled(message.enabled);
}
window.onEnabledSet = onEnabledSet;


function toggleGlobalEnabled() {
  setGlobalEnabled(!isEnabled);
  console.info('toggled enabled:', isEnabled);
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
