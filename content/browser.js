// this file is the JavaScript backing for the UI wrangling which happens in
// browser.xul. It also initializes the Greasemonkey singleton which contains
// all the main injection logic, though that should probably be a proper XPCOM
// service and wouldn't need to be initialized in that case.

var GM_BrowserUI = {};

/**
 * nsISupports.QueryInterface
 */
GM_BrowserUI.QueryInterface = function(aIID) {
  if (!aIID.equals(Components.interfaces.nsISupports) &&
      !aIID.equals(Components.interfaces.nsIObserver) &&
      !aIID.equals(Components.interfaces.gmIBrowserWindow) &&
      !aIID.equals(Components.interfaces.nsISupportsWeakReference))
    throw Components.results.NS_ERROR_NO_INTERFACE;

  return GM_BrowserUI;
};


/**
 * Called when this file is parsed, by the last line. Set up initial objects,
 * do version checking, and set up listeners for browser xul load and location
 * changes.
 */
GM_BrowserUI.init = function() {
  window.addEventListener("load", GM_BrowserUI.chromeLoad, false);
  window.addEventListener("unload", GM_BrowserUI.chromeUnload, false);

  window.addEventListener('DOMNodeInserted', GM_BrowserUI.nodeInserted, false);
  window.addEventListener('DOMNodeRemoved', GM_BrowserUI.nodeRemoved, false);

  GM_BrowserUI.toolbarButton = null;
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

  // hook various events
  document.getElementById("appcontent")
    .addEventListener("DOMContentLoaded", GM_BrowserUI.contentLoad, true);
  document.getElementById("sidebar")
    .addEventListener("DOMContentLoaded", GM_BrowserUI.contentLoad, true);
  document.getElementById("contentAreaContextMenu")
    .addEventListener("popupshowing", GM_BrowserUI.contextMenuShowing, false);

  // listen for clicks on the install bar
  Components.classes["@mozilla.org/observer-service;1"]
            .getService(Components.interfaces.nsIObserverService)
            .addObserver(GM_BrowserUI, "install-userscript", true);

  // we use this to determine if we are the active window sometimes
  GM_BrowserUI.winWat = Components
      .classes["@mozilla.org/embedcomp/window-watcher;1"]
      .getService(Components.interfaces.nsIWindowWatcher);

  // register for notifications from greasemonkey-service about ui type things
  GM_BrowserUI.gmSvc = Components
      .classes["@greasemonkey.mozdev.org/greasemonkey-service;1"]
      .getService(Components.interfaces.gmIGreasemonkeyService)
      .wrappedJSObject;
  // reference this once, so that the getter is called at least once, and the
  // initialization routines will run, no matter what
  GM_BrowserUI.gmSvc.config;
};

/**
 * gmIBrowserWindow.openInTab
 */
GM_BrowserUI.openInTab = function(domWindow, url) {
  if (GM_BrowserUI.isMyWindow(domWindow)) {
    GM_BrowserUI.tabBrowser.addTab(url);
  }
};

/**
 * Gets called when a DOMContentLoaded event occurs somewhere in the browser.
 * If that document is in in the top-level window of the focused tab, find
 * it's menu items and activate them.
 */
GM_BrowserUI.contentLoad = function(e) {
  if (!GM_getEnabled()) return;

  var safeWin = e.target.defaultView;
  var unsafeWin = safeWin.wrappedJSObject;
  var href = safeWin.location.href;

  if (GM_isGreasemonkeyable(href)) {
    GM_BrowserUI.gmSvc.domContentLoaded(safeWin, window);
  }

  // Show the greasemonkey install banner if we are navigating to a .user.js
  // file in a top-level tab.  If the file was previously cached it might have
  // been given a number after .user, like gmScript.user-12.js
  if (safeWin == safeWin.top &&
      href.match(/\.user(?:-\d+)?\.js$/) &&
      !/text\/html/i.test(safeWin.document.contentType)) {
    var browser = GM_BrowserUI.tabBrowser.getBrowserForDocument(safeWin.document);
    GM_BrowserUI.showInstallBanner(browser);
  }
};


/**
 * Shows the install banner across the top of the tab that is displayed when
 * a user selects "show script source" in the install dialog.
 */
GM_BrowserUI.showInstallBanner = function(browser) {
  var greeting = GM_BrowserUI.bundle.getString("greeting.msg");

  var notificationBox = GM_BrowserUI.tabBrowser.getNotificationBox(browser);

  // Remove existing notifications. Notifications get removed
  // automatically onclick and on page navigation, but we need to remove
  // them ourselves in the case of reload, or they stack up.
  for (var i = 0, child; child = notificationBox.childNodes[i]; i++) {
    if (child.getAttribute("value") == "install-userscript") {
      notificationBox.removeNotification(child);
    }
  }

  var notification = notificationBox.appendNotification(
    greeting,
    "install-userscript",
    "chrome://greasemonkey/skin/icon16.png",
    notificationBox.PRIORITY_WARNING_MEDIUM,
    [{
      label: GM_BrowserUI.bundle.getString("greeting.btn"),
      accessKey: GM_BrowserUI.bundle.getString("greeting.btnAccess"),
      popup: null,
      callback: GM_BrowserUI.installCurrentScript
    }]
  );
};

/**
 * Called from greasemonkey service when we should load a user script.
 */
GM_BrowserUI.startInstallScript = function(uri, contentWin, timer) {
  if (!timer) {
    // docs for nsicontentpolicy say we're not supposed to block, so short
    // timer.
    window.setTimeout(
      GM_BrowserUI.startInstallScript, 0, uri, contentWin, true);
    return;
  }

  GM_BrowserUI.scriptDownloader_ =
    new GM_ScriptDownloader(window, uri, GM_BrowserUI.bundle, contentWin);
  GM_BrowserUI.scriptDownloader_.startInstall();
};


/**
 * Open the tab to show the contents of a script and display the banner to let
 * the user install it.
 */
GM_BrowserUI.showScriptView = function(scriptDownloader) {
  GM_BrowserUI.scriptDownloader_ = scriptDownloader;

  var tab = GM_BrowserUI.tabBrowser.addTab(scriptDownloader.script.previewURL);
  var browser = GM_BrowserUI.tabBrowser.getBrowserForTab(tab);

  GM_BrowserUI.tabBrowser.selectedTab = tab;
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
  } else {
    throw new Error("Unexpected topic received: {" + topic + "}");
  }
};

/**
 * Handles the install button getting clicked.
 */
GM_BrowserUI.installCurrentScript = function() {
  GM_BrowserUI.scriptDownloader_.installScript();
};

GM_BrowserUI.installScript = function(script){
  GM_getConfig().install(script);

  var tools = {};
  Components.utils.import("resource://greasemonkey/GM_notification.js", tools);
  tools.GM_notification(
      "'" + script.name + "' "
      + GM_BrowserUI.bundle.getString("statusbar.installed"));
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
  var contextItem = document.getElementById("view-userscript");
  var contextSep = document.getElementById("install-userscript-sep");

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

/**
 * Helper to determine if a given dom window is in this tabbrowser
 */
GM_BrowserUI.isMyWindow = function(domWindow) {
  var tabbrowser = getBrowser();
  var browser;

  for (var i = 0; browser = tabbrowser.browsers[i]; i++) {
    if (browser.contentWindow == domWindow) {
      return true;
    }
  }

  return false;
};

GM_BrowserUI.refreshStatus = function() {
  var enabledEl = document.getElementById("gm_toggle_enabled");
  var checkedEl = document.getElementById("gm_toggle_checked");

  if (GM_getEnabled()) {
    checkedEl.setAttribute('checked', true);
    enabledEl.removeAttribute('disabled');
  } else {
    checkedEl.removeAttribute('checked');
    enabledEl.setAttribute('disabled', 'yes');
  }
};

GM_BrowserUI.viewContextItemClicked = function() {
  var uri = GM_BrowserUI.getUserScriptLinkUnderPointer();

  GM_BrowserUI.scriptDownloader_ = new GM_ScriptDownloader(
      window, uri, GM_BrowserUI.bundle);
  GM_BrowserUI.scriptDownloader_.startViewScript();
};

GM_BrowserUI.nodeInserted = function(aEvent) {
  if ('greasemonkey-tbb' == aEvent.target.id) {
    var toolbarButton = aEvent.target;

    // Duplicate the tools menu popup inside the toolbar button.
    if (!toolbarButton.firstChild) {
      var menupopup = document.getElementById('gm_general_menu').firstChild;
      toolbarButton.appendChild(menupopup.cloneNode(true));
    }
  }
};

GM_BrowserUI.nodeRemoved = function(aEvent) {
  if ('greasemonkey-tbb' == aEvent.target.id) {
    GM_BrowserUI.toolbarButton = null;
  }
};

GM_BrowserUI.init();
