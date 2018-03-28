/*
This file is responsible for tracking and exposing the global "enabled" state
of Greasemonkey.
*/

// Private implementation.
(function() {

let isEnabled = true;
chrome.storage.local.get('globalEnabled', v => {
  isEnabled = v['globalEnabled'];
  if ('undefined' == typeof isEnabled) isEnabled = true;
  setIcon();
});


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
  }, logUnhandledError);
  setIcon();
  chrome.storage.local.set({'globalEnabled': enabled});
}
window.setGlobalEnabled = setGlobalEnabled;
function onEnabledSet(message, sender, sendResponse) {
  setGlobalEnabled(message.enabled);
}
window.onEnabledSet = onEnabledSet;


function setIcon() {
  // Firefox for Android does not have setIcon
  // https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/browserAction/setIcon#Browser_compatibility
  if (!chrome.browserAction.setIcon) {
    return;
  }
  let iconPath = chrome.extension.getURL('skin/icon.svg');
  if (isEnabled) {
    chrome.browserAction.setIcon({'path': iconPath});
  } else {
    let img = document.createElement('img');
    img.onload = function() {
      let canvas = document.createElement('canvas');
      let ctx = canvas.getContext('2d');
      ctx.globalAlpha = 0.5;
      ctx.drawImage(img, 0, 0);
      chrome.browserAction.setIcon({
        'imageData': ctx.getImageData(0, 0, img.width, img.height),
      });
    };
    img.src = iconPath;
  }
}


function toggleGlobalEnabled() {
  setGlobalEnabled(!isEnabled);
}
window.toggleGlobalEnabled = toggleGlobalEnabled;


function onEnabledToggle(message, sender, sendResponse) {
  try {
    toggleGlobalEnabled();
    sendResponse(isEnabled);
  } catch (e) { console.error(e); }
}
window.onEnabledToggle = onEnabledToggle;

})();
