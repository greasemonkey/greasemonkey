'use strict';
const defaultIconUrl = chrome.runtime.getURL('skin/userscript.png');

/** The URL of an icon to display for the given script (placeholder if none). */
function iconUrl(userScript) {
  return userScript.iconBlob
      ? URL.createObjectURL(userScript.iconBlob)
      : defaultIconUrl;
}
