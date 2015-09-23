Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import('chrome://greasemonkey-modules/content/prefmanager.js');
Components.utils.import('chrome://greasemonkey-modules/content/util.js');

// this file is the JavaScript backing for the UI wrangling which happens in
// browser.xul. It also initializes the Greasemonkey singleton which contains
// all the main injection logic, though that should probably be a proper XPCOM
// service and wouldn't need to be initialized in that case.

function GM_BrowserUI() {};

GM_BrowserUI.init = function() {
  window.addEventListener("load", GM_BrowserUI.chromeLoad, false);
  window.addEventListener("unload", GM_BrowserUI.chromeUnload, false);
  window.messageManager.addMessageListener('greasemonkey:open-in-tab',
      GM_BrowserUI.openInTab);
};

/**
 * The browser XUL has loaded. Find the elements we need and set up our
 * listeners and wrapper objects.
 */
GM_BrowserUI.chromeLoad = function(e) {
  // Store DOM element references in this object, also for use elsewhere.
  GM_BrowserUI.tabBrowser = document.getElementById("content");
  GM_BrowserUI.bundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
      .getService(Components.interfaces.nsIStringBundleService)
      .createBundle("chrome://greasemonkey/locale/gm-browser.properties");

  // Update visual status when enabled state changes.
  GM_prefRoot.watch("enabled", GM_BrowserUI.refreshStatus);
  GM_BrowserUI.refreshStatus();

  document.getElementById('content').addEventListener(
      'DOMContentLoaded', function(aEvent) {
        var safeWin = aEvent.target.defaultView;
        var href = safeWin.location.href;
        GM_BrowserUI.checkDisabledScriptNavigation(aEvent, safeWin, href);
      }, true);

  document.getElementById("contentAreaContextMenu")
    .addEventListener("popupshowing", GM_BrowserUI.contextMenuShowing, false);

  GM_BrowserUI.gmSvc = GM_util.getService();
  // Reference this once, so that the getter is called at least once, and the
  // initialization routines will run, no matter what.
  GM_BrowserUI.gmSvc.config;

  // Initialize the chrome side handling of menu commands.
  GM_MenuCommander.initialize();

  GM_BrowserUI.showToolbarButton();

  // Make sure this is imported at least once, so its internal timer starts.
  Components.utils.import('chrome://greasemonkey-modules/content/stats.js');
};

/**
 * Opens the specified URL in a new tab.
 */
GM_BrowserUI.openTab = function(url) {
  gBrowser.selectedTab = gBrowser.addTab(url);
};

/**
 * Handles tab opening for a GM_openInTab API call.
 */
GM_BrowserUI.openInTab = function(aMessage) {
  var browser = aMessage.target;
  var tabBrowser = browser.getTabBrowser();
  var scriptTab = tabBrowser.getTabForBrowser(browser);
  var scriptTabIsCurrentTab = scriptTab == tabBrowser.mCurrentTab;
  // Work around a race condition in Firefox code with E10S disabled.
  // See #2107 and #2234
  // Todo: Remove timeout when http://bugzil.la/1200334 is resolved.
  GM_util.timeout(function () {
    var newTab = tabBrowser.addTab(
        aMessage.data.url,
        {
            'ownerTab': scriptTab,
            'relatedToCurrent': scriptTabIsCurrentTab,
        });

    var getBool = Services.prefs.getBoolPref;

    var prefBg = (aMessage.data.inBackground === null)
        ? getBool("browser.tabs.loadInBackground")
        : aMessage.data.inBackground;
    if (scriptTabIsCurrentTab && !prefBg) tabBrowser.selectedTab = newTab;

    var prefRel = (aMessage.data.afterCurrent === null)
        ? getBool("browser.tabs.insertRelatedAfterCurrent")
        : aMessage.data.afterCurrent;
    if (prefRel) {
      tabBrowser.moveTabTo(newTab, scriptTab._tPos + 1);
    } else {
      tabBrowser.moveTabTo(newTab, tabBrowser.tabs.length - 1);
    }
  }, 0);
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
  GM_BrowserUI.getUserScriptUrlUnderPointer(function(aUrl) {
    var contextItem = document.getElementById("greasemonkey-view-userscript");
    var contextSep = document.getElementById("greasemonkey-install-sep");
    contextItem.hidden = contextSep.hidden = !aUrl;
  });
};

GM_BrowserUI.getUserScriptUrlUnderPointer = function(callback) {
  var culprit = gContextMenu.target || document.popupNode;
  if (!culprit) {
    callback(null);
    return;
  }

  var mm = gBrowser.selectedBrowser.messageManager;
  var messageHandler;
  messageHandler = function (aMessage) {
    mm.removeMessageListener("greasemonkey:context-menu-end", messageHandler);

    var href = aMessage.data.href;
    if (href && href.match(/\.user\.js(\?|$)/i)) {
      callback(href);
    } else {
      callback(null);
    }
  };
  mm.addMessageListener("greasemonkey:context-menu-end", messageHandler);

  mm.sendAsyncMessage(
      "greasemonkey:context-menu-start", {}, {"culprit": culprit});
};

GM_BrowserUI.refreshStatus = function() {
  var enabledEl = document.getElementById("gm_toggle_enabled");
  var checkedEl = document.getElementById("gm_toggle_checked");

  if (GM_util.getEnabled()) {
    checkedEl.setAttribute('checked', true);
    enabledEl.removeAttribute('disabled');
  } else {
    checkedEl.setAttribute('checked', false);
    enabledEl.setAttribute('disabled', 'yes');
  }
};

// Not used directly, kept for GreaseFire.  See #1507.
GM_BrowserUI.startInstallScript = function(aUri) {
  GM_util.showInstallDialog(aUri.spec, gBrowser);
};

GM_BrowserUI.viewContextItemClicked = function() {
  GM_BrowserUI.getUserScriptUrlUnderPointer(function(aUrl) {
    if (!aUrl) return;

    var scope = {};
    Components.utils.import(
        "chrome://greasemonkey-modules/content/remoteScript.js", scope);
    var rs = new scope.RemoteScript(aUrl);
    rs.downloadScript(function (aSuccess) {
      if (aSuccess) {
        rs.showSource(gBrowser);
      } else {
        alert(rs.errorMessage);
      }
    });
  });
};

GM_BrowserUI.showToolbarButton = function() {
  // See #1652.  During transition, this might be set, but not readable yet;
  // transition happens in an async callback to get addon version.  If existing
  // version is "0.0" (the default), this hasn't happened yet, so try later.
  if ('0.0' == GM_prefRoot.getValue("version")) {
    setTimeout(GM_BrowserUI.showToolbarButton, 50);
    return;
  }

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

GM_BrowserUI.checkDisabledScriptNavigation = function(aEvent, aSafeWin, aHref) {
  if (!aHref.match(/\.user\.js$/)) return;
  if (aSafeWin.document.contentType.match(/^text\/(x|ht)ml/)) return;

  // Handle enabled (i.e. show script source button) navigation by default.
  var msg = GM_BrowserUI.bundle.GetStringFromName('greeting.msg');
  var buttons = [];

  if (!GM_util.getEnabled()) {
    // Add options for disabled state.
    msg = GM_BrowserUI.bundle.GetStringFromName('disabledWarning');
    buttons.push({
      'label': GM_BrowserUI.bundle.GetStringFromName('disabledWarning.enable'),
      'accessKey': GM_BrowserUI.bundle.GetStringFromName('disabledWarning.enable.accessKey'),
      'popup': null,
      'callback': function() { GM_util.setEnabled(true); }
    });
    buttons.push({
      'label': GM_BrowserUI.bundle.GetStringFromName('disabledWarning.enableAndInstall'),
      'accessKey': GM_BrowserUI.bundle.GetStringFromName('disabledWarning.enableAndInstall.accessKey'),
      'popup': null,
      'callback': function() {
        GM_util.setEnabled(true);
        GM_util.showInstallDialog(aHref, gBrowser);
      }
    });
  }

  buttons.push({
    'label': GM_BrowserUI.bundle.GetStringFromName('disabledWarning.install'),
    'accessKey': GM_BrowserUI.bundle.GetStringFromName('disabledWarning.install.accessKey'),
    'popup': null,
    'callback': GM_util.hitch(this, function() {
      GM_util.showInstallDialog(aHref, gBrowser);
    })
  });

  var notificationBox = gBrowser.getNotificationBox();
  notificationBox.appendNotification(
    msg,
    "install-userscript",
    "chrome://greasemonkey/skin/icon16.png",
    notificationBox.PRIORITY_WARNING_MEDIUM,
    buttons
  );
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
  // Make sure this event was triggered by opening the actual monkey menu,
  // not one of its submenus.
  if (aEvent.currentTarget != aEvent.target) return;

  var mm = getBrowser().mCurrentBrowser.frameLoader.messageManager;

  var callback = null;
  callback = function(message) {
    mm.removeMessageListener("greasemonkey:frame-urls", callback);

    var urls = message.data.urls;
    asyncShowPopup(aEvent, urls);
  };

  mm.addMessageListener("greasemonkey:frame-urls", callback);
  mm.sendAsyncMessage("greasemonkey:frame-urls", {});
}

function asyncShowPopup(aEvent, urls) {
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
    mi.setAttribute("label", script.localized.name);
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

  var point;
  if (runsFramed.length) {
    point = scriptsFramedEl;
    runsFramed.forEach(
        function(script) { point = appendScriptAfter(script, point); });
  }
  point = scriptsTopEl;
  runsOnTop.forEach(
      function(script) { point = appendScriptAfter(script, point); });

  // Propagate to commands sub-menu.
  GM_MenuCommander.onPopupShowing(aEvent);
}

/**
 * Clean up the menu after it hides to prevent memory leaks
 */
function GM_hidePopup(aEvent) {
  // Only handle the actual monkey menu event.
  if (aEvent.currentTarget != aEvent.target) return;
  // Propagate to commands sub-menu.
  GM_MenuCommander.onPopupHiding();
}

// Short-term workaround for #1406: Tab Mix Plus breaks opening links in
// new tabs because it depends on this function, and incorrectly checks for
// existance of GM_BrowserUI instead of it.
function GM_getEnabled() {
  return GM_util.getEnabled();
}
