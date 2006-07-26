
// this file is the javascript backing for the UI wrangling which happens in
// browser.xul. It also initializes the Greasemonkey singleton which contains
// all the main injection logic, though that should probably be a proper XPCOM
// service and wouldn't need to be initialized in that case.

var GM_BrowserUI = new Object();

/**
 * nsISupports.QueryInterface
 */
GM_BrowserUI.QueryInterface = function(aIID) {
  if (!aIID.equals(Components.interfaces.nsISupports) &&
      !aIID.equals(Components.interfaces.gmIBrowserWindow) &&
      !aIID.equals(Components.interfaces.nsISupportsWeakReference))
    throw Components.results.NS_ERROR_NO_INTERFACE;

  return this;
}


/**
 * Called when this file is parsed, by the last line. Set up initial objects,
 * do version checking, and set up listeners for browser xul load and location
 * changes.
 */
GM_BrowserUI.init = function() {
  this.menuCommanders = [];
  this.currentMenuCommander = null;

  GM_updateVersion();

  GM_listen(window, "load", GM_hitch(this, "chromeLoad"));
  GM_listen(window, "unload", GM_hitch(this, "chromeUnload"));
}

/**
 * The browser XUL has loaded. Find the elements we need and set up our
 * listeners and wrapper objects.
 */
GM_BrowserUI.chromeLoad = function(e) {
  // get all required DOM elements
  this.tabBrowser = document.getElementById("content");
  this.appContent = document.getElementById("appcontent");
  this.contextMenu = document.getElementById("contentAreaContextMenu"); 
  this.statusImage = document.getElementById("gm-status-image");
  this.statusLabel = document.getElementById("gm-status-label");
  this.statusPopup = document.getElementById("gm-status-popup");
  this.statusEnabledItem = document.getElementById("gm-status-enabled-item");
  this.toolsMenu = document.getElementById("menu_ToolsPopup");
  this.bundle = document.getElementById("gm-browser-bundle");

  this.greetz = new Array();
  for(var i = 0; i < 6; i++){
    this.greetz.push(this.bundle.getString('greetz.' + i));
  }

  // seamonkey compat
  if (!this.toolsMenu) {
    this.toolsMenu = document.getElementById("taskPopup");
  }

  // update visual status when enabled state changes
  this.enabledWatcher = GM_hitch(this, "refreshStatus");
  GM_prefRoot.watch("enabled", this.enabledWatcher);

  // hook various events
  GM_listen(this.appContent, "DOMContentLoaded", GM_hitch(this, "contentLoad"));
  GM_listen(this.contextMenu, "popupshowing", GM_hitch(this, "contextMenuShowing"));
  GM_listen(this.toolsMenu, "popupshowing", GM_hitch(this, "toolsMenuShowing"));	

  // listen for clicks on the install bar
  Components.classes["@mozilla.org/observer-service;1"]
            .getService(Components.interfaces.nsIObserverService)
            .addObserver(this, "install-userscript", true);

  // we use this to determine if we are the active window sometimes
  this.winWat = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
                          .getService(Components.interfaces.nsIWindowWatcher);

  // this gives us onLocationChange
  document.getElementById("content").addProgressListener(this,
    Components.interfaces.nsIWebProgress.NOTIFY_LOCATION);

  // update enabled icon
  this.refreshStatus();

  // register for notifications from greasemonkey-service about ui type things
  this.gmSvc = Components.classes["@greasemonkey.mozdev.org/greasemonkey-service;1"]
                         .getService(Components.interfaces.gmIGreasemonkeyService);

  this.gmSvc.registerBrowser(this);
}

/**
 * gmIBrowserWindow.registerMenuCommand
 */
GM_BrowserUI.registerMenuCommand = function(menuCommand) {
  if (this.isMyWindow(menuCommand.window)) {
    var commander = this.getCommander(menuCommand.window);

    commander.registerMenuCommand(menuCommand.name,
                                  menuCommand.doCommand,
                                  menuCommand.accelKey,
                                  menuCommand.accelModifiers,
                                  menuCommand.accessKey);
  }
}

/**
 * gmIBrowserWindow.openInTab
 */
GM_BrowserUI.openInTab = function(domWindow, url) {
  if (this.isMyWindow(domWindow)) {
    document.getElementById("content").addTab(url);
  }
}

/**
 * Gets called when a DOMContentLoaded event occurs somewhere in the browser.
 * If that document is in in the top-level window of the focused tab, find 
 * it's menu items and activate them.
 */
GM_BrowserUI.contentLoad = function(e) {
  var unsafeWin;
  var href;
  var commander;

  if (GM_deepWrappersEnabled(window)) {
    // when deep wrappers are enabled, e.target is already a deep xpcnw
    unsafeWin = e.target.defaultView;

    // in DPa2, there was a bug that made this *not* a deep wrapper.
    if (unsafeWin.wrappedJSObject) {
      unsafeWin = unsafeWin.wrappedJSObject;
    }

    href = e.target.location.href;
  } else {
    // otherwise we need to wrap it manually
    unsafeWin = new XPCNativeWrapper(
                  new XPCNativeWrapper(e, "target").target,
                  "defaultView").defaultView;
    href = new XPCNativeWrapper(
              new XPCNativeWrapper(unsafeWin, "location").location,
              "href").href;
  }

  if (GM_getEnabled() && GM_isGreasemonkeyable(href)) {
    commander = this.getCommander(unsafeWin);

    // if this content load is in the focused tab, attach the menuCommaander  
    if (unsafeWin == this.tabBrowser.selectedBrowser.contentWindow) {
      this.currentMenuCommander = commander;
      this.currentMenuCommander.attach();
    }

    this.gmSvc.domContentLoaded({ wrappedJSObject: unsafeWin });
  
    GM_listen(unsafeWin, "pagehide", GM_hitch(this, "contentUnload"));
  }

  if (GM_getEnabled() && href.match(/\.user\.js($|\?)/i)) {
    // find the browser the user script is loading in
    for (var i = 0, browser; browser = this.tabBrowser.browsers[i]; i++) {
      if (browser.contentWindow == unsafeWin) {
        var pick = Math.round(Math.random() * (GM_BrowserUI.greetz.length - 1));
        var greeting = GM_BrowserUI.greetz[pick] 
	               + this.bundle.getString("greeting.msg");

	if (this.tabBrowser.showMessage) {
	  // Firefox 1.5 and lower
	  this.tabBrowser.showMessage(
            browser,
	    "chrome://greasemonkey/content/status_on.gif",
	    greeting,
	    this.bundle.getString('greeting.btn'),
	    null /* default doc shell */,
	    "install-userscript",
	    null /* no popuup */,
	    "top",
	    true /* show close button */,
	    "I" /* access key */);
	} else {
	  // Firefox 2.0+
	  var notificationBox = this.tabBrowser.getNotificationBox(browser);

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
	    "chrome://greasemonkey/content/status_on.gif",
	    notificationBox.PRIORITY_WARNING_MEDIUM,
	    [{ label: this.bundle.getString('greeting.btn'),
	       accessKey: "I",
	       popup: null,
               callback: GM_hitch(this, "installCurrentScript") }]);
	}

        break;
      }
    }
  }
}

/**
 * Implements nsIObserve.observe. Right now we're only observing our own
 * install-userscript, which happens when the install bar is clicked.
 */
GM_BrowserUI.observe = function(subject, topic, data) {
  if (topic == "install-userscript") {
    if (window == this.winWat.activeWindow) {
      this.installCurrentScript();
    }
  } else {
    throw new Error("Unexpected topic received: {" + topic + "}");
  }
};

/**
 * Handles the install button getting clicked.
 */
GM_BrowserUI.installCurrentScript = function() {
  new ScriptDownloader().installFromURL(
    this.tabBrowser.selectedBrowser.contentWindow.location.href);
};

/**
 * The browser's location has changed. Usually, we don't care. But in the case
 * of tab switching we need to change the list of commands displayed in the
 * User Script Commands submenu.
 */
GM_BrowserUI.onLocationChange = function(a,b,c) {
  if (this.currentMenuCommander != null) {
    this.currentMenuCommander.detach();
    this.currentMenuCommander = null;
  }

  var menuCommander = this.getCommander(this.tabBrowser.selectedBrowser.
                                        contentWindow);
  
  if (menuCommander) {
    this.currentMenuCommander = menuCommander;
    this.currentMenuCommander.attach();
  }
}

/**
 * A content document has unloaded. We need to remove it's menuCommander to 
 * avoid leaking it's memory. 
 */
GM_BrowserUI.contentUnload = function(e) {
  if (e.persisted) {
    return;
  }

  var unsafeWin = e.target.defaultView;

  // remove the commander for this document  
  var commander = null;
  
  // looping over commanders rather than using getCommander because we need
  // the index into commanders.splice.
  for (var i = 0; item = this.menuCommanders[i]; i++) {
    if (item.win == unsafeWin) {

      log("* Found corresponding commander. Is currentMenuCommander: " + 
          (item.commander == this.currentMenuCommander));

      if (item.commander == this.currentMenuCommander) {
        this.currentMenuCommander.detach();
        this.currentMenuCommander = null;
      }
      
      this.menuCommanders.splice(i, 1);

      log("* Found and removed corresponding commander")
      break;
    }
  }
}

/**
 * The browser XUL has unloaded. We need to let go of the pref watcher so
 * that a non-existant window is not informed when greasemonkey enabled state
 * changes. And we need to let go of the progress listener so that we don't
 * leak it's memory.
 */
GM_BrowserUI.chromeUnload = function() {
  GM_prefRoot.unwatch("enabled", this.enabledWatcher);
  this.tabBrowser.removeProgressListener(this);
  this.gmSvc.unregisterBrowser(this);
  delete this.menuCommanders;
}


GM_BrowserUI.contextMenuShowing = function() {
  var contextItem = ge("install-userscript");
  var contextSep = ge("install-userscript-sep");

  var culprit = document.popupNode;

  while (culprit && culprit.tagName && culprit.tagName.toLowerCase() != "a") {
     culprit = culprit.parentNode;
  }

  contextItem.hidden = 
    contextSep.hidden = 
    !this.getUserScriptLinkUnderPointer();
}


GM_BrowserUI.getUserScriptLinkUnderPointer = function() {
  var contextItem = ge("install-userscript");
  var contextSep = ge("install-userscript-sep");

  var culprit = document.popupNode;

  while (culprit && culprit.tagName && culprit.tagName.toLowerCase() != "a") {
     culprit = culprit.parentNode;
  }

  if (culprit && culprit.href && 
      culprit.href.match(/\.user\.js(\?|$)/i) != null) {
    return culprit;
  } else {
    return null;
  }
}


GM_BrowserUI.toolsMenuShowing = function() {
  var installItem = ge("userscript-tools-install");
  var disabled = true;
  
  if (window._content) {
    var locationGetter = new XPCNativeWrapper(window._content, "location");

    if (locationGetter.location) {
      var href = new XPCNativeWrapper(locationGetter.location, "href").href;

      if (href.match(/\.user\.js(\?|$)/i)) {
        disabled = false;
      }
    }
  }
  
  installItem.setAttribute("disabled", disabled.toString());
}

/**
 * Helper method which gets the menuCommander corresponding to a given 
 * document
 */
GM_BrowserUI.getCommander = function(unsafeWin) {
  for (var i = 0; i < this.menuCommanders.length; i++) {
    if (this.menuCommanders[i].win == unsafeWin) {
      return this.menuCommanders[i].commander;
    }
  }

  // no commander found. create one and add it.
  var commander = new GM_MenuCommander(document);
  this.menuCommanders.push({win:unsafeWin, commander:commander});

  return commander;
}

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
}

function GM_showPopup(aEvent) {
	var config = new Config(getScriptFile("config.xml"));
	config.load();
	var popup = aEvent.target;
	var url = getBrowser().contentWindow.document.location.href;

  // set the enabled/disabled state
  GM_BrowserUI.statusEnabledItem.setAttribute("checked", GM_getEnabled());

	// remove all the scripts from the list
  for (var i = popup.childNodes.length - 1; i >= 0; i--) {
    if (popup.childNodes[i].hasAttribute("value")) {
      popup.removeChild(popup.childNodes[i]);
    }
	}

  var foundScript = false;

	// build the new list of scripts
	for (var i = 0, script = null; script = config.scripts[i]; i++) {
    incloop: for (var j = 0; j < script.includes.length; j++) {
      var pattern = convert2RegExp(script.includes[j]);
      if (pattern.test(url)) {
        for (var k = 0; k < script.excludes.length; k++) {
          pattern = convert2RegExp(script.excludes[k]);
          if (pattern.test(url)) {
            break incloop;
          }
        }

        foundInjectedScript = true;

        var mi = document.createElement('menuitem');
        mi.setAttribute('label', script.name);
        mi.setAttribute('value', i);
        mi.setAttribute('type', 'checkbox');
        mi.setAttribute('checked', script.enabled.toString());

        popup.insertBefore(mi, document.getElementById("gm-status-no-scripts-sep"));

        break incloop;
      }
    }
	}

  document.getElementById("gm-status-no-scripts").collapsed = foundInjectedScript;
}

function GM_popupClicked(aEvent) {
	var config = new Config(getScriptFile("config.xml"));
	config.load();
	var scriptNum=aEvent.target.value;
	if (!config.scripts[scriptNum]) return;
	config.scripts[scriptNum].enabled=!config.scripts[scriptNum].enabled;
	config.save();
}

/**
 * Greasemonkey's enabled state has changed, either as a result of clicking
 * the icon in this window, clicking it in another window, or even changing
 * the mozilla preference that backs it directly.
 */
GM_BrowserUI.refreshStatus = function() {
  if (GM_getEnabled()) {
    this.statusImage.src = "chrome://greasemonkey/content/status_on.gif";
    this.statusImage.tooltipText = this.bundle.getString('tooltip.enabled');
  } else {
    this.statusImage.src = "chrome://greasemonkey/content/status_off.gif";
    this.statusImage.tooltipText = this.bundle.getString('tooltip.disabled');
  }
}

GM_BrowserUI.newUserScript = function() {
  var tempname = "newscript.user.js";
  
  var source = getContentDir();
  source.append("template.user.js");
  
  var dest = Components.classes["@mozilla.org/file/directory_service;1"]
        .getService(Components.interfaces.nsIProperties)
        .get("TmpD", Components.interfaces.nsILocalFile);
        
  var destFile = dest.clone().QueryInterface(Components.interfaces.nsILocalFile);
  destFile.append(tempname);
  
  if (destFile.exists()) {
    destFile.remove(false);
  }

  source.copyTo(dest, tempname);

  openInEditor(
    destFile,
    document.getElementById("gm-browser-bundle").getString("editor.prompt"));
}

GM_BrowserUI.showStatus = function(message, autoHide) {
  if (this.statusLabel.collapsed) {
    this.statusLabel.collapsed = false;
  }

  var current = parseInt(this.statusLabel.style.width);
  this.statusLabel.value = message;
  this.statusLabel.style.width = "";
  var max = this.statusLabel.boxObject.width;

  this.statusLabel.style.width = current + "px";
  
  this.showAnimation = new Accelimation(this.statusLabel.style, 
                                          "width", max, 300, 2, "px");
  this.showAnimation.onend = GM_hitch(this, "showStatusAnimationEnd", autoHide);
  this.showAnimation.start();
}

GM_BrowserUI.showStatusAnimationEnd = function(autoHide) {
  this.showAnimation = null;
  this.setAutoHideTimer();
}

GM_BrowserUI.setAutoHideTimer = function() {
  if (this.autoHideTimer) {
    window.clearTimeout(this.autoHideTimer);
  }

  this.autoHideTimer = window.setTimeout(GM_hitch(this, "hideStatus"), 3000);
}

GM_BrowserUI.hideStatus = function() {
  if (!this.hideAnimation) {
    this.autoHideTimer = null;
    this.hideAnimation = new Accelimation(this.statusLabel.style, 
                                            "width", 0, 300, 2, "px");
    this.hideAnimation.onend = GM_hitch(this, "hideStatusAnimationEnd");
    this.hideAnimation.start();
  }
}

GM_BrowserUI.hideStatusAnimationEnd = function() {
  this.hideAnimation = null;
  this.statusLabel.collapsed = true;
}

// necessary for webProgressListener implementation
GM_BrowserUI.onProgressChange = function(webProgress,b,c,d,e,f){}
GM_BrowserUI.onStateChange = function(a,b,c,d){}
GM_BrowserUI.onStatusChange = function(a,b,c,d){}
GM_BrowserUI.onSecurityChange = function(a,b,c){}
GM_BrowserUI.onLinkIconAvailable = function(a){}

loggify(GM_BrowserUI, "GM_BrowserUI");

log("calling init...")
GM_BrowserUI.init();

// the following functions were copied wholesale from old code without 
// refactoring. need to be reorganized a little.

function manageMenuItemClicked() {
   window.openDialog("chrome://greasemonkey/content/manage.xul", "manager", 
    "resizable,centerscreen,modal");
}

function installMenuItemClicked() {
  var sd = new ScriptDownloader();
  var unsafeDoc = new XPCNativeWrapper(window._content, "document").document;
  var unsafeLoc = new XPCNativeWrapper(window._content, "location").location;

  sd.installFromURL(new XPCNativeWrapper(unsafeLoc, "href").href);
}

function installContextItemClicked() {
  var sd = new ScriptDownloader();
  sd.installFromURL(GM_BrowserUI.getUserScriptLinkUnderPointer().href);
}

// this is a debug function to make sure that menuCommanders are being
// created and destroyed at the correct time.

// window.setInterval(GM_checkState, 3000);

function GM_checkState() {
  var commander;
  var urls = [];
  for (var i = 0; commander = GM_BrowserUI.menuCommanders[i]; i++) {
    urls.push(commander.win.location.href);
  }
  
  log(urls.length + " active commanders: " + urls.join(", "));
}
