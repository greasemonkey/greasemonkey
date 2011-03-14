(function() {

var statusEl;
var statusEnabledItemEl;
var statusImageEl;
var statusPopupEl;
var stringBundle;

window.addEventListener('load', function() {
      statusEl = document.getElementById('gm-status');
      statusEnabledItemEl = document.getElementById("gm-status-enabled-item");
      statusImageEl = document.getElementById("gm-status-image");
      statusPopupEl = document.getElementById('gm-status-popup');
      stringBundle = document.getElementById("gm-browser-bundle");

      // update visual status when enabled state changes
      GM_prefRoot.watch("enabled", refreshStatus);
      refreshStatus();
  }, false);


/**
 * Handle clicking one of the items in the popup. Left-click toggles the enabled
 * state, right-click opens in an editor.
 */
function GM_popupClicked(aEvent) {
  if (aEvent.button == 0 || aEvent.button == 2) {
    var script = aEvent.target.script;
    if (!script) return;

    if (aEvent.button == 0) {
      // left-click: toggle enabled state
      script.enabled =! script.enabled;
    } else {
      // right-click: open in editor
      GM_openInEditor(script);
    }

    closeMenus(aEvent.target);
  }
}
window.GM_popupClicked = GM_popupClicked;


function GM_showPopup(aEvent) {
  function urlsOfAllFrames(contentWindow) {
    function collect(contentWindow) {
      urls = urls.concat(urlsOfAllFrames(contentWindow));
    }
    var urls = [contentWindow.location.href];
    Array.prototype.slice.call(contentWindow.frames).forEach(collect);
    return urls;
  }

  function uniq(a) {
    var seen = {}, list = [], item;
    for (var i = 0; i < a.length; i++) {
      item = a[i];
      if (!seen.hasOwnProperty(item))
        seen[item] = list.push(item);
    }
    return list;
  }

  function scriptsMatching(urls) {
    function testMatchURLs(script) {
      function testMatchURL(url) {
        return script.matchesURL(url);
      }
      return urls.some(testMatchURL);
    }
    return GM_getConfig().getMatchingScripts(testMatchURLs);
  }

  function appendScriptToPopup(script) {
    if (script.needsUninstall) return;
    var mi = document.createElement("menuitem");
    mi.setAttribute("label", script.name);
    mi.script = script;
    mi.setAttribute("type", "checkbox");
    mi.setAttribute("checked", script.enabled.toString());
    popup.insertBefore(mi, tail);
  }

  var popup = aEvent.target;
  var tail = document.getElementById("gm-status-no-scripts-sep");

  // set the enabled/disabled state
  statusEnabledItemEl.setAttribute("checked", GM_getEnabled());

  // remove all the scripts from the list
  for (var i = popup.childNodes.length - 1; i >= 0; i--) {
    var node = popup.childNodes[i];
    if (node.script || node.getAttribute("value") == "hack") {
      popup.removeChild(node);
    }
  }

  var urls = uniq( urlsOfAllFrames( getBrowser().contentWindow ));
  var runsOnTop = scriptsMatching( [urls.shift()] ); // first url = top window
  var runsFramed = scriptsMatching( urls ); // remainder are all its subframes

  // drop all runsFramed scripts already present in runsOnTop
  for (var i = 0; i < runsOnTop.length; i++) {
    var j = 0, item = runsOnTop[i];
    while (j < runsFramed.length) {
      if (item === runsFramed[j]) {
        runsFramed.splice(j, 1);
      } else {
        j++;
      }
    }
  }

  // build the new list of scripts
  if (runsFramed.length) {
    runsFramed.forEach(appendScriptToPopup);
    if (runsOnTop.length) { // only add the separator if there is stuff below
      var separator = document.createElement("menuseparator");
      separator.setAttribute("value", "hack"); // remove it in the loop above
      popup.insertBefore(separator, tail);
    }
  }
  runsOnTop.forEach(appendScriptToPopup);

  var foundInjectedScript = !!(runsFramed.length + runsOnTop.length);
  document.getElementById("gm-status-no-scripts").collapsed = foundInjectedScript;
}
window.GM_showPopup = GM_showPopup;


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
