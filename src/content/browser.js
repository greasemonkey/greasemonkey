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

  this.docHandlers = [];
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
GM_BrowserUI.chromeLoad = function(e) {
  GM_log("> GM_BrowserUI.chromeLoad")

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

  // this gives us onLocationChange
  document.getElementById("content").addProgressListener(this,
    Components.interfaces.nsIWebProgress.NOTIFY_LOCATION);

  // update enabled icon
  this.refreshStatus();

  GM_log("< GM_BrowserUI.chromeLoad")
}

/**
 * Gets called by browser.webProgress when a document changes state. We watch
 * for STATE_START and create GM_DocHandler instances around the corresponding
 * DOMWindow.
 */
GM_BrowserUI.onDocStart = function(unsafeWin, unsafeTop, isFile) {
  GM_log("> GM_BrowserUI.onDocStart");

  // get the right menu commander for this document. a doc might not have one
  // because it is an iframe. we don't have a context menu for frames yet.
  var commander = null;

  if (unsafeWin == unsafeTop) {
    // if the doc is the top-level doc, create a new commander for it
    commander = new GM_MenuCommander();
    this.menuCommanders.push({win:unsafeWin, commander:commander});
  }

  new GM_DocHandler(unsafeWin, window, commander, isFile);
  
  GM_log("< GM_BrowserUI.onDocStart");
}

/**
 * Gets called when a DOMContentLoaded event occurs somewhere in the browser.
 * If that document is in in the top-level window of the focused tab, find 
 * it's menu items and activate them.
 */
GM_BrowserUI.contentLoad = function(e) {
  GM_log("> GM_BrowserUI.contentLoad");

  var unsafeTarget = new XPCNativeWrapper(e, "target").target;
  var unsafeWin = new XPCNativeWrapper(unsafeTarget, "defaultView").defaultView;
  var unsafeLoc = new XPCNativeWrapper(unsafeWin, "location").location;
  var href = new XPCNativeWrapper(unsafeLoc, "href").href;

  if (GM_isGreasemonkeyable(href)) {
    // if this content load is in the focused tab, attach the menuCommaander  
    if (unsafeWin == this.tabBrowser.selectedBrowser.contentWindow) {
      var commander = this.getCommander(unsafeWin);
    
      if (!commander) {
        throw new Error("No menu commaner found for URL: " + href);
      }

      this.currentMenuCommander = commander;
      this.currentMenuCommander.attach();
    }
  
    GM_listen(unsafeWin, "unload", GM_hitch(this, "contentUnload"));
  }
  
  GM_log("< GM_BrowserUI.contentLoad");
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
 * A content document has unloaded. We need to remove it's menuCommander to 
 * avoid leaking it's memory. 
 */
GM_BrowserUI.contentUnload = function(e) {
  GM_log("> GM_BrowserUI.contentUnload");

  var unsafeWin = new XPCNativeWrapper(e, "currentTarget").currentTarget;

  // remove the commander for this document  
  var commander = null;
  
  // looping over commanders rather than using getCommander because we need
  // the index into commanders.splice.
  for (var i = 0; item = this.menuCommanders[i]; i++) {
    if (item.win == unsafeWin) {

      GM_log("* Found corresponding commander. Is currentMenuCommander: " + 
             (item.commander == this.currentMenuCommander));

      if (item.commander == this.currentMenuCommander) {
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

/**
 * The browser XUL has unloaded. We need to let go of the pref watcher so
 * that a non-existant window is not informed when greasemonkey enabled state
 * changes. And we need to let go of the progress listener so that we don't
 * leak it's memory.
 */
GM_BrowserUI.chromeUnload = function() {
  GM_log("> GM_BrowserUI.chromeUnload")

  GM_prefRoot.unwatch("enabled", this.enabledWatcher);
  this.tabBrowser.removeProgressListener(this);

  GM_log("< GM_BrowserUI.chromeUnload")
}


GM_BrowserUI.contextMenuShowing = function() {
  GM_log('> contextMenuShowing');
  var contextItem = ge("install-userscript");
  var contextSep = ge("install-userscript-sep");

  var culprit = document.popupNode;

  while (culprit && culprit.tagName && culprit.tagName.toLowerCase() != "a") {
     culprit = culprit.parentNode;
  }

  contextItem.hidden = contextSep.hidden = 
    !(culprit && culprit.href && 
       culprit.href.match(/\.user\.js(\?|$)/i) != null);

  GM_log('< contextMenuShowing');
}


GM_BrowserUI.toolsMenuShowing = function() {
  GM_log('> toolsMenuShowing');
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
  GM_log('< toolsMenuShowing');
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
  openInEditor(destFile);
}

// necessary for webProgressListener implementation
GM_BrowserUI.onProgressChange = function(webProgress,b,c,d,e,f){}
GM_BrowserUI.onStateChange = function(a,b,c,d){}
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

// window.setInterval(GM_checkState, 3000);

function GM_checkState() {
  var commander;
  var urls = [];
  for (var i = 0; commander = GM_BrowserUI.menuCommanders[i]; i++) {
    urls.push(commander.win.location.href);
  }
  
  GM_log(urls.length + " active commanders: " + urls.join(", "));
}



/**
 * This is wierd. It turns out that catching DOC_START from the webProgress on
 * tabBrowser will make you miss the very first one, for the document that
 * loads as a new window opens.
 *
 * The only way to catch that one from the browser appears to be to listen to
 * *every* DOC_START throughout mozilla. So we do that here, and then check to
 * see if the window which is loading corresponds to any of the tabs in this 
 * browser window.
 *
 * TODO: move this to an XPCOM service which the browser windows register
 * themselves with.
 */

var GM_DocStartListener = {
  QueryInterface : function(aIID) {
    if (!aIID.equals(Components.interfaces.nsIWebProgressListener) &&
        !aIID.equals(Components.interfaces.nsISupportsWeakReference) &&
        !aIID.equals(Components.interfaces.nsISupports)) 
    {
      throw Components.results.NS_ERROR_NO_INTERFACE;
    }
    
    return this;
  },

  onStateChange : function(aWebProgress, aRequest, aStateFlags, aStatus) {
    GM_log("> GM_DocStartListener.onStateChange");
    
    var name = null;

    if (!GM_BrowserUI.getEnabled()) {
      GM_log("* Greasemonkey disabled");
      return;
    }

    if (aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_START) {
      try {
        name = aRequest.name;
      } catch(e) {
        // For some requests, not only is there no name, retrieving it throws
        // an error. Just ignore those.
        GM_logError(e);
        return;
      }
      
      if (GM_isGreasemonkeyable(aRequest.name)) {
        GM_log("caught request: " + aRequest.name);
        
        // this.tabBrowser apparently doesn't work here
        var browsers = document.getElementById("content").browsers;
        var browser;
        
        var unsafeWin = aWebProgress.DOMWindow;
        var unsafeTop = new XPCNativeWrapper(unsafeWin, "top").top;
        
        GM_log("window is top: " + (unsafeWin == unsafeTop));
      
        // find the browser associated with this request.
        for (var i = 0; browser = browsers[i]; i++) {
          if (browser.contentWindow == unsafeTop) {
            GM_log("request is in this window, forward to doc start");
            GM_BrowserUI.onDocStart(unsafeWin, unsafeTop, 
                                    GM_isFileScheme(aRequest.name));
          }
        }
      }
    }

    GM_log("< GM_DocStartListener.onStateChange");
  }  
}

GM_log("starting GM_DocListener...");

Components.classes["@mozilla.org/docloaderservice;1"]
          .getService(Components.interfaces.nsIWebProgress)
          .addProgressListener(GM_DocStartListener, 
                               Components.interfaces.nsIWebProgress
                                                    .NOTIFY_STATE_DOCUMENT);
  
window.addEventListener("unload", function() {
  Components.classes["@mozilla.org/docloaderservice;1"]
            .getService(Components.interfaces.nsIWebProgress)
            .removeProgressListener(GM_DocStartListener);
}, false);
