function GM_BrowserUI(win) {
  this.win = win;

  this.obsSvc = Cc["@mozilla.org/observer-service;1"]
                  .getService(Ci.nsIObserverService);
  this.winWat = Cc["@mozilla.org/embedcomp/window-watcher;1"]
                  .getService(Ci.nsIWindowWatcher);

  bindMethods(this);

  this.win.addEventListener("load", this.handleWinLoad, false);
  this.win.addEventListener("unload", this.handleWinUnload, false);
}

GM_BrowserUI.getHiddenWin = function() {
  if (!this.hiddenWin) {
    this.hiddenWin = Cc["@mozilla.org/appshell/appShellService;1"]
                       .getService(Ci.nsIAppShellService)
                       .hiddenDOMWindow;
  }

  return this.hiddenWin;
}

/**
 * The browser XUL has loaded. Find the elements we need and set up our
 * listeners and wrapper objects.
 */
GM_BrowserUI.prototype.handleWinLoad = function(e) {
  this.doc = this.win.document;

  // get all required DOM elements
  this.tabBrowser = this.doc.getElementById("content");
  this.statusImage = this.doc.getElementById("gm-status-image");
  this.statusLabel = this.doc.getElementById("gm-status-label");
  this.statusEnabledItem = this.doc.getElementById("gm-status-enabled-item");
  this.toolsMenu = this.doc.getElementById("gm-userscript-commands");
  this.contextMenu = this.doc.getElementById("gm-userscript-commands-context");
  this.bundle = this.doc.getElementById("gm-browser-bundle");
  this.greetz = new Array;

  // update visual status when enabled state changes
  GM_prefRoot.watch("enabled", this.refreshStatus);

  // hook various events
  this.doc.getElementById("contentAreaContextMenu").addEventListener(
    "popupshowing", this.handleContextShowing, false);
  this.doc.getElementById("menu_ToolsPopup").addEventListener(
    "popupshowing", this.handleToolsShowing, false);
  this.doc.getElementById("gm-tools-install").addEventListener(
    "command", this.handleInstallToolsMenuClicked, false);
  this.doc.getElementById("gm-manage-userscript").addEventListener(
    "command", this.handleManageUserScriptClicked, false);
  this.doc.getElementById("gm-new-userscript").addEventListener(
    "command", this.handleNewUserScriptClicked, false);
  this.doc.getElementById("gm-context-install").addEventListener(
    "command", this.handleInstallContextMenuClicked, false);
  this.doc.getElementById("gm-status-image").addEventListener(
    "click", this.handleStatusImageClicked, false);
  this.doc.getElementById("gm-status-popup").addEventListener(
    "popupshowing", this.handleStatusPopupShowing, false);
  this.doc.getElementById("gm-status-popup").addEventListener(
    "command", this.handleStatusPopupCommand, false);
  this.doc.getElementById("gm-status-manage").addEventListener(
    "command", this.handleManageUserScriptClicked, false);
  this.doc.getElementById("gm-status-enabled-item").addEventListener(
    "command", this.handleStatusEnabledClicked, false);
  this.doc.getElementById("appcontent").addEventListener(
    "DOMContentLoaded", this.handleContentLoad, false);

  // listen for clicks on the install bar
  this.obsSvc.addObserver(this, "install-userscript", false);

  // update enabled icon
  this.refreshStatus();
}

/**
 * The browser window has unloaded. We unregister some listeners here to avoid
 * leaks. 
 */
GM_BrowserUI.prototype.handleWinUnload = function(e) {
  // remove install bar obsrever
  this.obsSvc.removeObserver(this, "install-userscript");

  GM_prefRoot.unwatch("enabled", this.refreshStatus);
}

/**
 * Gets called when a DOMContentLoaded event occurs somewhere in the browser.
 * If that document is in in the top-level window of the focused tab, find 
 * it's menu items and activate them.
 */
GM_BrowserUI.prototype.handleContentLoad = function(e) {
  var win = e.target.defaultView;

  if (GM_getEnabled() && GM_isGreasemonkeyable(win.location.href)) {
    this.inject(win);
  }
  
  for(var i = 0; i < 6; i++){
    this.greetz.push(this.bundle.getString('greetz.' + i));
  }
  if (GM_getEnabled() && win.location.pathname.match(/\.user\.js$/i)) {
    // find the browser the user script is loading in
    for (var i = 0, browser; browser = this.tabBrowser.browsers[i]; i++) {
      if (browser.contentWindow == win) {
        var pick = Math.round(Math.random() * (this.greetz.length - 1));
        var greeting = this.greetz[pick];

        this.tabBrowser.showMessage(
          browser,
          "chrome://greasemonkey/content/status_on.gif",
          greeting + " " + this.bundle.getString('greeting.msg'),
          this.bundle.getString('greeting.btn'),
          null /* default doc shell */,
          "install-userscript",
          null /* no popuup */,
          "top",
          true /* show close button */,
          "I" /* access key */);

        break;
      }
    }
  }
}

GM_BrowserUI.prototype.inject = function(win) {
  var config = new Config("config.xml");
  config.load();

  var matchedScripts = config.getScriptsForURL(win.location.href);

  win.__gm = {};
  win.__gm.menuCommander = new GM_MenuCommander(win.document);

  var sandbox;
  var script;
  var logger;
  var storage;
  var xmlhttpRequester;
  var contentExecutor;
  var menuCommander;

  for (var i = 0; script = matchedScripts[i]; i++) {
    if (!script.enabled) {
      continue;
    }

    sandbox = new Components.utils.Sandbox(win);

    logger = new GM_ScriptLogger(script);
    storage = new GM_ScriptStorage(script);
    xmlhttpRequester = new GM_xmlhttpRequester(GM_BrowserUI.getHiddenWin(),
                                               this.win);

    sandbox.window = win;
    sandbox.document = win.document;
    sandbox.unsafeWindow = win.wrappedJSObject;

    // add our own APIs
    sandbox.GM_addStyle = bind(GM_addStyle, null, sandbox.document);
    sandbox.GM_log = bind(logger.log, logger);
    sandbox.GM_setValue = bind(storage.setValue, storage);
    sandbox.GM_getValue = bind(storage.getValue, storage);
    sandbox.GM_openInTab = bind(this.tabBrowser.addTab, this.tabBrowser);
    sandbox.GM_executeContentScript = bind(GM_executeContentScript, sandbox.window);
    sandbox.GM_xmlhttpRequest = bind(xmlhttpRequester.contentStartRequest, xmlhttpRequester);
    sandbox.GM_registerMenuCommand = win.__gm.menuCommander.registerMenuCommand;

    sandbox.__proto__ = win;

    var scriptStr = "(function(){\n" +
                    getContents(getScriptFileURI(script.filename)) +
                    "\n})()";

    try {
      Components.utils.evalInSandbox(scriptStr, sandbox);
    } catch (e) {
      GM_logError(e);
    }
  }
}


// nsIObserver

/**
 * Implements nsIObserve.observe. Right now we're only observing our own
 * install-userscript, which happens when the install bar is clicked.
 */
GM_BrowserUI.prototype.observe = function(subject, topic, data) {
  if (topic == "install-userscript") {
    if (this.win == this.winWat.activeWindow) {
      new ScriptDownloader(this).installFromURL(
        this.tabBrowser.selectedBrowser.contentWindow.location.href);
    }
  } else {
    throw new Error("Unexpected topic received: {" + topic + "}");
  }
}


// UI Event handlers

GM_BrowserUI.prototype.handleInstallToolsMenuClicked = function(e) {
  var sd = new ScriptDownloader(this);
  sd.installFromURL(this.tabBrowser.selectedBrowser.contentWindow.location.href);
}

GM_BrowserUI.prototype.handleManageUserScriptClicked = function(e) {
   this.win.openDialog("chrome://greasemonkey/content/manage.xul", 
                       "manager", 
                       "resizable,centerscreen,modal");
}

GM_BrowserUI.prototype.handleNewUserScriptClicked = function(e) {
  var tempname = "newscript.user.js";
  
  var source = getContentDir();
  source.append("template.user.js");
  
  var dest = Cc["@mozilla.org/file/directory_service;1"]
        .getService(Ci.nsIProperties)
        .get("TmpD", Ci.nsILocalFile);
        
  var destFile = dest.clone().QueryInterface(Ci.nsILocalFile);
  destFile.append(tempname);
  
  if (destFile.exists()) {
    destFile.remove(false);
  }

  source.copyTo(dest, tempname);
  openInEditor(destFile, this.win);
}

GM_BrowserUI.prototype.handleInstallContextMenuClicked = function(e) {
  var sd = new ScriptDownloader(this);
  sd.installFromURL(this.getUserScriptLinkUnderPointer().href);
}

GM_BrowserUI.prototype.handleStatusImageClicked = function(e) {
  if (!e.button) {
    GM_setEnabled(!GM_getEnabled());
  }
}

GM_BrowserUI.prototype.handleStatusPopupShowing = function(e) {
	var config = new Config(getScriptFile("config.xml"));
	config.load();
	var popup = e.target;
  var win = this.tabBrowser.selectedBrowser.contentWindow;
  var url = win.location.href;

  // set the enabled/disabled state
  this.statusEnabledItem.setAttribute("checked", GM_getEnabled());

	// remove all the scripts from the list
  for (var i = popup.childNodes.length - 1; i >= 0; i--) {
    if (popup.childNodes[i].hasAttribute("value")) {
      popup.removeChild(popup.childNodes[i]);
    }
	}

	// build the new list of scripts
  var scripts = config.getScriptsForURL(url);

  for (var i = 0, script = null; script = scripts[i]; i++) {
    var mi = this.doc.createElement('menuitem');
    mi.setAttribute('label', script.name);
    mi.setAttribute('value', i);
    mi.setAttribute('type', 'checkbox');
    mi.setAttribute('checked', script.enabled.toString());

    popup.insertBefore(mi, this.doc.getElementById("gm-status-no-scripts-sep"));
  }

  this.doc.getElementById("gm-status-no-scripts").collapsed = 
    (scripts.length != 0);

  e.preventBubble();
}

GM_BrowserUI.prototype.handleStatusPopupCommand = function(e) {
	var config = new Config(getScriptFile("config.xml"));
	config.load();
	var scriptNum=e.target.value;
	if (!config.scripts[scriptNum]) return;
	config.scripts[scriptNum].enabled=!config.scripts[scriptNum].enabled;
	config.save();
  e.preventBubble();
}

GM_BrowserUI.prototype.handleStatusEnabledClicked = function(e) {
  GM_setEnabled(!GM_getEnabled());
}

GM_BrowserUI.prototype.handleContextShowing = function(e) {
  var contextItem = this.doc.getElementById("gm-context-install");
  var contextSep = this.doc.getElementById("gm-context-install-sep");

  var culprit = this.doc.popupNode;

  while (culprit && culprit.tagName && culprit.tagName.toLowerCase() != "a") {
     culprit = culprit.parentNode;
  }

  contextItem.hidden = 
    contextSep.hidden = 
    !this.getUserScriptLinkUnderPointer();

  var doc = culprit.nodeType == Ci.nsIDOMNode.DOCUMENT_NODE ? culprit : culprit.ownerDocument;
  var gm = doc.defaultView.__gm;
  if (gm) {
    gm.menuCommander.initMenuItems(this.contextMenu.firstChild);
  }
}

GM_BrowserUI.prototype.handleToolsShowing = function() {
  var installItem = this.doc.getElementById("gm-tools-install");
  var disabled = true;
  var contentWin = this.tabBrowser.selectedBrowser.contentWindow;
  
  if (contentWin && contentWin.location) {
    if (contentWin.location.href.match(/\.user\.js(\?|$)/i)) {
      disabled = false;
    }
  }
  
  installItem.setAttribute("disabled", disabled.toString());

  var gm = this.tabBrowser.selectedBrowser.contentWindow.__gm;
  if (gm) {
    gm.menuCommander.initMenuItems(this.toolsMenu.firstChild);
  }
}



// Helper methods

/**
 * Helper to determine if a given dom window is in this tabbrowser
 */
GM_BrowserUI.prototype.isMyWindow = function(domWindow) {
  var browser;

  for (var i = 0; browser = this.tabBrowser.browsers[i]; i++) {
    if (browser.contentWindow == domWindow) {
      return true;
    }
  }

  return false;
}

GM_BrowserUI.prototype.getUserScriptLinkUnderPointer = function() {
  var contextItem = this.doc.getElementById("gm-install-userscript");
  var contextSep = this.doc.getElementById("gm-install-userscript-sep");

  var culprit = this.doc.popupNode;

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

/**
 * Greasemonkey's enabled state has changed, either as a result of clicking
 * the icon in this window, clicking it in another window, or even changing
 * the mozilla preference that backs it directly.
 */
GM_BrowserUI.prototype.refreshStatus = function() {
  if (GM_getEnabled()) {
    this.statusImage.src = "chrome://greasemonkey/content/status_on.gif";
    this.statusImage.tooltipText = this.bundle.getString('tooltip.enabled');
  } else {
    this.statusImage.src = "chrome://greasemonkey/content/status_off.gif";
    this.statusImage.tooltipText = this.bundle.getString('tooltip.disabled');
  }
}

GM_BrowserUI.prototype.showStatus = function(message, autoHide) {
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
  this.showAnimation.onend = bind(this.showStatusAnimationEnd, autoHide);
  this.showAnimation.start();
}

GM_BrowserUI.prototype.showStatusAnimationEnd = function(autoHide) {
  this.showAnimation = null;
  this.setAutoHideTimer();
}

GM_BrowserUI.prototype.setAutoHideTimer = function() {
  if (this.autoHideTimer) {
    this.win.clearTimeout(this.autoHideTimer);
  }

  this.autoHideTimer = this.win.setTimeout(this.hideStatus, 3000);
}

GM_BrowserUI.prototype.hideStatus = function() {
  if (!this.hideAnimation) {
    this.autoHideTimer = null;
    this.hideAnimation = new Accelimation(this.statusLabel.style, 
                                            "width", 0, 300, 2, "px");
    this.hideAnimation.onend = this.hideStatusAnimationEnd;
    this.hideAnimation.start();
  }
}

GM_BrowserUI.prototype.hideStatusAnimationEnd = function() {
  this.hideAnimation = null;
  this.statusLabel.collapsed = true;
}

loggify(GM_BrowserUI.prototype, "GM_BrowserUI");
