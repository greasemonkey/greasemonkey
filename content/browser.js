Components.utils.import('resource://greasemonkey/prefmanager.js');
Components.utils.import('resource://greasemonkey/util.js');

// this file is the JavaScript backing for the UI wrangling which happens in
// browser.xul. It also initializes the Greasemonkey singleton which contains
// all the main injection logic, though that should probably be a proper XPCOM
// service and wouldn't need to be initialized in that case.

function GM_BrowserUI() {};

/**
 * nsISupports.QueryInterface
 */
GM_BrowserUI.QueryInterface = function(aIID) {
  if (!aIID.equals(Components.interfaces.nsISupports) &&
      !aIID.equals(Components.interfaces.nsIObserver) &&
      !aIID.equals(Components.interfaces.nsISupportsWeakReference))
    throw Components.results.NS_ERROR_NO_INTERFACE;

  return GM_BrowserUI;
};


GM_BrowserUI.init = function() {
  window.addEventListener("load", GM_BrowserUI.chromeLoad, false);
  window.addEventListener("unload", GM_BrowserUI.chromeUnload, false);
};

/**
 * The browser XUL has loaded. Find the elements we need and set up our
 * listeners and wrapper objects.
 */
GM_BrowserUI.chromeLoad = function(e) {
  // Store DOM element references in this object, also for use elsewhere.
  GM_BrowserUI.tabBrowser = document.getElementById("content");
  GM_BrowserUI.bundle = document.getElementById("gm-browser-bundle");

  // Update visual status when enabled state changes.
  GM_prefRoot.watch("enabled", GM_BrowserUI.refreshStatus);
  GM_BrowserUI.refreshStatus();

  // Use the appcontent element specifically, see #1344.
  document.getElementById("appcontent")
      .addEventListener("DOMContentLoaded", GM_BrowserUI.contentLoad, true);
  gBrowser.addEventListener("pagehide", GM_BrowserUI.pagehide, true);
  gBrowser.addEventListener("pageshow", GM_BrowserUI.pageshow, true);

  var sidebar = document.getElementById("sidebar");
  sidebar.addEventListener("DOMContentLoaded", GM_BrowserUI.contentLoad, true);
  sidebar.addEventListener("pagehide", GM_BrowserUI.pagehide, true);
  sidebar.addEventListener("pageshow", GM_BrowserUI.pageshow, true);

  document.getElementById("contentAreaContextMenu")
    .addEventListener("popupshowing", GM_BrowserUI.contextMenuShowing, false);

  var observerService = Components.classes["@mozilla.org/observer-service;1"]
     .getService(Components.interfaces.nsIObserverService);
  observerService.addObserver(GM_BrowserUI, "install-userscript", true);
  observerService.addObserver(GM_BrowserUI, "inner-window-destroyed", true);

  // we use this to determine if we are the active window sometimes
  GM_BrowserUI.winWat = Components
      .classes["@mozilla.org/embedcomp/window-watcher;1"]
      .getService(Components.interfaces.nsIWindowWatcher);

  GM_BrowserUI.gmSvc = GM_util.getService();
  // Reference this once, so that the getter is called at least once, and the
  // initialization routines will run, no matter what.
  GM_BrowserUI.gmSvc.config;

  GM_BrowserUI.showToolbarButton();
};

GM_BrowserUI.contentLoad = function(event) {
  if (!GM_util.getEnabled()) return;

  var safeWin = event.target.defaultView;
  var href = safeWin.location.href;

  // Make sure we are still on the page that fired this event, see issue #1083.
  // But ignore hashes; see issue #1445.
  if (href.replace(/#.*/, '') == event.target.documentURI.replace(/#.*/, '')) {
    GM_BrowserUI.gmSvc.runScripts('document-end', safeWin);
  }
};

GM_BrowserUI.pagehide = function(aEvent) {
  var windowId = GM_util.windowIdForEvent(aEvent);
  if (aEvent.persisted) {
    GM_BrowserUI.gmSvc.contentFrozen(windowId);
  } else {
    GM_BrowserUI.gmSvc.contentDestroyed(windowId);
  }
};

GM_BrowserUI.pageshow = function(aEvent) {
  var windowId = GM_util.windowIdForEvent(aEvent);
  GM_BrowserUI.gmSvc.contentThawed(windowId);
};

/**
 * Implements nsIObserve.observe. Right now we're only observing our own
 * install-userscript, which happens when the install bar is clicked.
 */
GM_BrowserUI.observe = function(subject, topic, data) {
  if (topic == "install-userscript") {
    if (window == GM_BrowserUI.winWat.activeWindow) {
      GM_BrowserUI.installCurrentScript();
    }
  } else if (topic == "dom-window-destroyed") {
    GM_BrowserUI.gmSvc.contentDestroyed(GM_util.windowId(subject));
  } else if (topic == "inner-window-destroyed") {
    GM_BrowserUI.gmSvc.contentDestroyed(
        subject.QueryInterface(Components.interfaces.nsISupportsPRUint64).data);
  } else {
    throw new Error("Unexpected topic received: {" + topic + "}");
  }
};

GM_BrowserUI.openTab = function(url) {
  gBrowser.selectedTab = gBrowser.addTab(url);
};

/**
 * The browser XUL has unloaded. Destroy references/watchers/listeners.
 */
GM_BrowserUI.chromeUnload = function() {
  GM_prefRoot.unwatch("enabled", GM_BrowserUI.refreshStatus);
};

/**
 * Called when the content area context menu is showing. We figure out whether
 * to show our context items.
 */
GM_BrowserUI.contextMenuShowing = function() {
  var contextItem = document.getElementById("greasemonkey-view-userscript");
  var contextSep = document.getElementById("greasemonkey-install-sep");

  var culprit = document.popupNode;

  while (culprit && culprit.tagName && culprit.tagName.toLowerCase() != "a") {
     culprit = culprit.parentNode;
  }

  contextItem.hidden =
    contextSep.hidden =
    !GM_BrowserUI.getUserScriptLinkUnderPointer();
};


GM_BrowserUI.getUserScriptLinkUnderPointer = function() {
  var culprit = document.popupNode;

  while (culprit && culprit.tagName && culprit.tagName.toLowerCase() != "a") {
     culprit = culprit.parentNode;
  }

  if (!culprit || !culprit.href ||
      !culprit.href.match(/\.user\.js(\?|$)/i)) {
    return null;
  }

  var ioSvc = Components.classes["@mozilla.org/network/io-service;1"]
                        .getService(Components.interfaces.nsIIOService);
  var uri = ioSvc.newURI(culprit.href, null, null);

  return uri;
};

GM_BrowserUI.refreshStatus = function() {
  var enabledEl = document.getElementById("gm_toggle_enabled");
  var checkedEl = document.getElementById("gm_toggle_checked");

  if (GM_util.getEnabled()) {
    checkedEl.setAttribute('checked', true);
    enabledEl.removeAttribute('disabled');
  } else {
    checkedEl.removeAttribute('checked');
    enabledEl.setAttribute('disabled', 'yes');
  }
};

// Not used directly, kept for GreaseFire.  See #1507.
GM_BrowserUI.startInstallScript = function(aUri) {
  GM_util.showInstallDialog(aUri.spec, gBrowser, GM_util.getService());
};

GM_BrowserUI.viewContextItemClicked = function() {
  var uri = GM_BrowserUI.getUserScriptLinkUnderPointer();
  if (!uri) return;

  var scope = {};
  Components.utils.import('resource://greasemonkey/remoteScript.js', scope);
  var rs = new scope.RemoteScript(uri.spec);
  rs.downloadScript(function(aSuccess) {
    if (aSuccess) {
      rs.showSource(gBrowser);
    } else {
      alert(rs.errorMessage);
    }
  });
};

GM_BrowserUI.showToolbarButton = function() {
  // Once, enforce that the toolbar button is present.  For discoverability.
  if (!GM_prefRoot.getValue('haveInsertedToolbarbutton')) {
    GM_prefRoot.setValue('haveInsertedToolbarbutton', true);

    var navbar = document.getElementById("nav-bar");
    var newset = navbar.currentSet + ",greasemonkey-tbb";
    navbar.currentSet = newset;
    navbar.setAttribute("currentset", newset);
    document.persist("nav-bar", "currentset");
  }
};

GM_BrowserUI.openOptions = function() {
  openDialog('chrome://greasemonkey/content/options.xul', null, 'modal');
};

GM_BrowserUI.init();


/**
 * Handle clicking one of the items in the popup. Left-click toggles the enabled
 * state, right-click opens in an editor.
 */
function GM_popupClicked(aEvent) {
  var script = aEvent.target.script;
  if (!script) return;

  if ('command' == aEvent.type) {
    // left-click: toggle enabled state
    script.enabled =! script.enabled;
  } else if ('click' == aEvent.type && aEvent.button == 2) {
    // right-click: open in editor
    GM_util.openInEditor(script);
  }

  closeMenus(aEvent.target);
}


/**
 * When a menu pops up, fill its contents with the list of scripts.
 */
function GM_showPopup(aEvent) {
  function urlsOfAllFrames(contentWindow) {
    var urls = [contentWindow.location.href];
    function collect(contentWindow) {
      urls = urls.concat(urlsOfAllFrames(contentWindow));
    }
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
    return GM_util.getService().config.getMatchingScripts(testMatchURLs);
  }

  function appendScriptAfter(script, point) {
    if (script.needsUninstall) return;
    var mi = document.createElement("menuitem");
    mi.setAttribute("label", script.name);
    mi.script = script;
    mi.setAttribute("type", "checkbox");
    mi.setAttribute("checked", script.enabled.toString());
    point.parentNode.insertBefore(mi, point.nextSibling);
    return mi;
  }

  var popup = aEvent.target;
  var scriptsFramedEl = popup.getElementsByClassName("scripts-framed-point")[0];
  var scriptsTopEl = popup.getElementsByClassName("scripts-top-point")[0];
  var scriptsSepEl = popup.getElementsByClassName("scripts-sep")[0];
  var noScriptsEl = popup.getElementsByClassName("no-scripts")[0];

  // Remove existing menu items, between separators.
  function removeMenuitemsAfter(el) {
    while (true) {
      var sibling = el.nextSibling;
      if (!sibling || 'menuseparator' == sibling.tagName) break;
      sibling.parentNode.removeChild(sibling);
    }
  }
  removeMenuitemsAfter(scriptsFramedEl);
  removeMenuitemsAfter(scriptsTopEl);

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

  scriptsSepEl.collapsed = !(runsOnTop.length && runsFramed.length);
  noScriptsEl.collapsed = !!(runsOnTop.length || runsFramed.length);

  if (runsFramed.length) {
    var point = scriptsFramedEl;
    runsFramed.forEach(
        function(script) { point = appendScriptAfter(script, point); });
  }
  var point = scriptsTopEl;
  runsOnTop.forEach(
      function(script) { point = appendScriptAfter(script, point); });

  // Delegate menu commands call.
  var menuCommandPopup = popup.getElementsByTagName('menupopup')[0];
  GM_MenuCommander.onPopupShowing(menuCommandPopup);

  // Check/uncheck 'Enabled' menuitem in Greasemonkey menu
  // depends on Greasemonkey status.
  var gmStatus = popup.getElementsByClassName("gm-enabled-item")[0];
  gmStatus.setAttribute("checked", GM_getEnabled());
}

/**
 * Clean up the menu after it hides to prevent memory leaks
 */
function GM_hidePopup(aEvent) {
  var popup = aEvent.target;

  var menuCommandPopup = popup.getElementsByTagName('menupopup')[0];
  if(menuCommandPopup) GM_util.emptyEl(menuCommandPopup);
}

// Short-term workaround for #1406: Tab Mix Plus breaks opening links in
// new tabs because it depends on this function, and incorrectly checks for
// existance of GM_BrowserUI instead of it.
function GM_getEnabled() {
  return GM_util.getEnabled();
}
