(function private_scope() {
Components.utils.import('resource://greasemonkey/prefmanager.js');

var statusEl = null;
var statusImageEl = null;
var statusPopupEl = null;
var stringBundle = null;

window.addEventListener('load', function window_load() {
      statusEl = document.getElementById('gm-status');
      statusImageEl = document.getElementById("gm-status-image");
      statusPopupEl = document.getElementById('gm-status-popup');
      stringBundle = document.getElementById("gm-browser-bundle");

      // update visual status when enabled state changes
      GM_prefRoot.watch("enabled", refreshStatus);
      refreshStatus();
  }, false);


function GM_statusClicked(aEvent) {
  switch (aEvent.button) {
  case 0:
    GM_setEnabled(!GM_getEnabled());
    break;
  case 1:
    GM_OpenScriptsMgr();
    break;
  case 2:
    statusPopupEl.openPopup(statusEl, 'before_end', 0, 0, false, false);
    break;
  }
  return false;
};
window.GM_statusClicked = GM_statusClicked;


/**
 * Greasemonkey's enabled state has changed, either as a result of clicking
 * the icon in this window, clicking it in another window, or even changing
 * the mozilla preference that backs it directly.
 */
function refreshStatus() {
  if (GM_getEnabled()) {
    statusImageEl.src = "chrome://greasemonkey/skin/icon16.png";
    statusImageEl.tooltipText = stringBundle.getString("tooltip.enabled");
  } else {
    statusImageEl.src = "chrome://greasemonkey/skin/icon16disabled.png";
    statusImageEl.tooltipText = stringBundle.getString("tooltip.disabled");
  }
};

})();
