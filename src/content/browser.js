/*
=== START LICENSE ===

Copyright 2004-2005 Aaron Boodman

Contributors:
Jeremy Dunck, Nikolas Coukouma, Matthew Gray.

Permission is hereby granted, free of charge, to any person obtaining a copy 
of this software and associated documentation files (the "Software"), to deal 
in the Software without restriction, including without limitation the rights 
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell 
copies of the Software, and to permit persons to whom the Software is 
furnished to do so, subject to the following conditions:

Note that this license applies only to the Greasemonkey extension source 
files, not to the user scripts which it runs. User scripts are licensed 
separately by their authors.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE 
SOFTWARE.

=== END LICENSE ===

The above copyright notice and this permission notice shall be included in all 
copies or substantial portions of the Software.
*/

// this file is the javascript backing for the UI wrangling which happens in
// browser.xul. It also initializes the Greasemonkey singleton which contains
// all the main injection logic, though that should probably be a proper XPCOM
// service and wouldn't need to be initialized in that case.

var GM_BrowserUI = new Object();

/**
 * Called when this file is parsed, by the last line. Set up initial objects,
 * do version checking, and set up listeners for browser xul load and location
 * changes.
 */
GM_BrowserUI.init = function() {
  GM_log("> GM_BrowserUI.init");

  this.menuCommanders = [];
  this.currentMenuCommander = null;

  GM_updateVersion();

  GM_listen(window, "load", GM_hitch(this, "chromeLoad"));
  GM_listen(window, "unload", GM_hitch(this, "chromeUnload"));
  
  GM_log("< GM_BrowserUI.init");
}

/**
 * The browser XUL has loaded. Find the elements we need and set up our
 * listeners and wrapper objects.
 */
GM_BrowserUI.chromeLoad = function() {
  GM_log("> GM_BrowserUI.browserLoad")

  // get all required DOM elements
  this.tabBrowser = document.getElementById("content");
  this.appContent = document.getElementById("appcontent");
  this.contextMenu = document.getElementById("contentAreaContextMenu"); 
  this.statusImage = document.getElementById("gm-status-image");
  this.toolsMenu = document.getElementById("menu_ToolsPopup");

  // seamonkey compat
  if (!this.toolsMenu) {
    this.toolsMenu = document.getElementById("taskPopup");
  }

  // update visual status when enabled state changes
  this.enabledWatcher = GM_hitch(this, "refreshStatus");
  GM_prefRoot.watch("enabled", this.enabledWatcher);

  // hook various events
  GM_listen(this.statusImage, "mousedown", GM_hitch(this, "monkeyClicked"));
  GM_listen(this.appContent, "DOMContentLoaded", GM_hitch(this, "contentLoad"));
  GM_listen(this.contextMenu, "popupshowing", GM_hitch(this, "contextMenuShowing"));
  GM_listen(this.toolsMenu, "popupshowing", GM_hitch(this, "toolsMenuShowing"));	


  window.getBrowser().addProgressListener(this, 
    Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT);

  // update enabled icon
  this.refreshStatus();

  GM_log("< GM_BrowserUI.browserLoad")
}

GM_BrowserUI.contentLoad = function(e) {
  GM_log("> GM_BrowserUI.contentLoad: " + e.target.defaultView.location.href);

  if (!this.getEnabled()) {
    GM_log("* Greasemonkey disabled, skipping contentLoad");
    return;
  }

  var win = e.target.defaultView;
  var doc = win.document;

  if(!doc.body) {
    GM_log("* no body on document, existing")
    return;
  }

  GM_log("win == win.top: " + (win == win.top));
  if (win == win.top) {
    this.currentMenuCommander = new GM_MenuCommander(win);
    this.menuCommanders.push(this.currentMenuCommander);
    this.currentMenuCommander.attach();
  }

  new GM_DocHandler(win, window, this.currentMenuCommander);

  GM_listen(win, "unload", GM_hitch(this, "contentUnload"));

  GM_log("< GM_BrowserUI.contentLoad");
}

/**
 * The browser XUL has unloaded. We need to let go of the pref watcher so
 * that a non-existant window is not informed when greasemonkey enabled state
 * changes. And we need to let go of the progress listener so that we don't
 * leak it's memory.
 */
GM_BrowserUI.chromeUnload = function() {
  GM_log("> GM_BrowserUI.chromeUnload")

  GM_prefRoot.unwatch("enabled", this.enabledWatcher);
  window.getBrowser().removeProgressListener(this);

  GM_log("< GM_BrowserUI.chromeUnload")
}

/**
 * A content document has unloaded. We need to remove it's menuCommander to 
 * avoid leaking it's memory.
 */
GM_BrowserUI.contentUnload = function(e) {
  GM_log("> GM_BrowserUI.contentUnload");

  // remove the commander for this document  
  var commander = null;
  
  // looping over commanders rather than using getCommander because we need
  // the index into commanders.splice.
  for (var i = 0; commander = this.menuCommanders[i]; i++) {
    if (commander.contentWindow == e.currentTarget) {

      GM_log("* Found corresponding commander. Is currentMenuCommander: " + 
             (commander == this.currentMenuCommander));

      if (commander == this.currentMenuCommander) {
        this.currentMenuCommander.detach();
        this.currentMenuCommander = null;
      }
      
      this.menuCommanders.splice(i, 1);

      GM_log("* Found and removed corresponding commander")
      break;
    }
  }

  GM_log("< GM_BrowserUI.contentUnload");
}


GM_BrowserUI.contextMenuShowing = function() {
  GM_log('> contextMenuShowing');
  var culprit = document.popupNode;
  var contextItem = ge("install-userscript");
  var contextSep = ge("install-userscript-sep");

  contextItem.hidden = contextSep.hidden = 
    !(culprit.tagName.toLowerCase() == "a" 
    && culprit.href.match(/\.user\.js(\?|$)/i) != null);
  GM_log('< contextMenuShowing');
}

GM_BrowserUI.toolsMenuShowing = function() {
	GM_log('> toolsMenuShowing');
  var installItem = ge("userscript-tools-install");

  var disabled = !(window._content && window._content.location && 
  window._content.location.href.match(/\.user\.js(\?|$)/i) != null);

  installItem.setAttribute("disabled", disabled.toString());
  GM_log('< toolsMenuShowing');
}


/**
 * The browser's location has changed. Usually, we don't care. But in the case
 * of tab switching we need to change the list of commands displayed in the
 * User Script Commands submenu.
 */
GM_BrowserUI.onLocationChange = function(a,b,c) {
  GM_log("> GM_BrowserUI.onLocationChange");

  if (this.currentMenuCommander != null) {
    this.currentMenuCommander.detach();
    this.currentMenuCommander = null;
  }

  var menuCommander = this.getCommander(this.tabBrowser.selectedBrowser.
                                        contentWindow);
  
  if (!menuCommander) {
    GM_log("* no commander found for this document - it must be new.");
    return;
  }
  
  this.currentMenuCommander = menuCommander;
  this.currentMenuCommander.attach();

  GM_log("< GM_BrowserUI.onLocationChange");
}

/**
 * Builds up and inserts a submenu for the specified menu commands array
 */
GM_BrowserUI.updateMenu = function(menuElm, commandsArr) {
  GM_log("* TODO: GM_BrowserUI.updateMenu")
}

/**
 * Helper method which gets the menuCommander corresponding to a given 
 * document
 */
GM_BrowserUI.getCommander = function(win) {
  for (var i = 0; i < this.menuCommanders.length; i++) {
    if (this.menuCommanders[i].contentWindow == win) {
      return this.menuCommanders[i];
    }
  }
  
  return null;
}

/**
 * The Greasemonkey status icon has been clicked.
 */
GM_BrowserUI.monkeyClicked = function() {
  GM_log("> GM_BrowserUI.monkeyClicked")

  this.setEnabled(!this.getEnabled());

  GM_log("< GM_BrowserUI.monkeyClicked")
}

/**
 * Greasemonkey's enabled state has changed, either as a result of clicking
 * the icon in this window, clicking it in another window, or even changing
 * the mozilla preference that backs it directly.
 */
GM_BrowserUI.refreshStatus = function() {
  GM_log("> GM_BrowserUI.refreshStatus")
  
  if (this.getEnabled()) {
    this.statusImage.src = "chrome://greasemonkey/content/status_on.gif";
    this.statusImage.tooltipText = "Greasemonkey is enabled";
  } else {
    this.statusImage.src = "chrome://greasemonkey/content/status_off.gif";
    this.statusImage.tooltipText = "Greasemonkey is disabled";
  }
  
  GM_log("< GM_BrowserUI.refreshStatus")
}

GM_BrowserUI.getEnabled = function() {
  return GM_prefRoot.getValue("enabled", true);
}

GM_BrowserUI.setEnabled = function(enabled) {
  GM_prefRoot.setValue("enabled", enabled);
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
  ensureWindowsAssoc();
  destFile.launch();
}

GM_BrowserUI.onStateChange = function(a,b,c,d){}
GM_BrowserUI.onProgressChange = function(a,b,c,d,e,f){}
GM_BrowserUI.onStatusChange = function(a,b,c,d){}
GM_BrowserUI.onSecurityChange = function(a,b,c){}
GM_BrowserUI.onLinkIconAvailable = function(a){}

GM_log("calling init...")
GM_BrowserUI.init();

// the following functions were copied wholesale from old code without 
// refactoring. need to be reorganized a little.

function manageMenuItemClicked() {
   window.openDialog("chrome://greasemonkey/content/manage.xul", "manager", 
    "resizable,centerscreen,modal");
}

function installMenuItemClicked() {
  new ScriptDownloader(window._content.location.href).start();
}

function installContextItemClicked() {
  new ScriptDownloader(document.popupNode.href).start();
}

function installContextItemClicked() {
  new ScriptDownloader(document.popupNode.href).start();
}

// this is a debug function to make sure that menuCommanders are being
// created and destroyed at the correct time.

// window.setInterval(GM_checkState, 2000);

function GM_checkState() {
  var commander;
  var urls = [];
  for (var i = 0; commander = GM_BrowserUI.menuCommanders[i]; i++) {
    urls.push(commander.contentWindow.location.href);
  }
  
  GM_log(urls.length + " active commanders: " + urls.join(", "), true);
}