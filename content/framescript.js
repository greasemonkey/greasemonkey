let {utils: Cu, interfaces: Ci, classes: Cc} = Components;

Cu.import("resource://gre/modules/Services.jsm");

Cu.import('resource://greasemonkey/GM_setClipboard.js');
Cu.import("resource://greasemonkey/ipcscript.js");
Cu.import("resource://greasemonkey/miscapis.js");
Cu.import("resource://greasemonkey/sandbox.js");
Cu.import('resource://greasemonkey/util.js');


var gStripUserPassRegexp = new RegExp('(://)([^:/]+)(:[^@/]+)?@');
var gScriptRunners = {};

function ScriptRunner(aWindow, aUrl) {
  this.menuCommands = [];
  this.window = aWindow;
  this.windowId = GM_util.windowId(this.window);
  this.url = aUrl;
}

ScriptRunner.prototype.injectScripts = function(aScripts) {
  try {
    this.window.QueryInterface(Ci.nsIDOMChromeWindow);
    // Never ever inject scripts into a chrome context window.
    return;
  } catch(e) {
    // Ignore, it's good if we can't QI to a chrome window.
  }

  var winIsTop = true;
  try {
    this.window.QueryInterface(Ci.nsIDOMWindow);
    if (this.window.frameElement) winIsTop = false;
  } catch (e) {
    // Ignore non-DOM-windows.
    dump('Could not QI this.window to nsIDOMWindow at\n'
        + this.url + ' ?!\n');
  }

  for (var i = 0, script = null; script = aScripts[i]; i++) {
    if (script.noframes && !winIsTop) continue;
    var sandbox = createSandbox(script, this);
    runScriptInSandbox(script, sandbox);
  }
}

ScriptRunner.prototype.openInTab = function(aUrl, aInBackground) {
  var response = sendSyncMessage('greasemonkey:open-in-tab', {
    inBackground: aInBackground,
    url: aUrl
  });

  return response ? response[0] : null;
}

ScriptRunner.prototype.registeredMenuCommand = function(aCommand) {
  var length = this.menuCommands.push(aCommand);

  sendAsyncMessage("greasemonkey:menu-command-registered", {
    accessKey: aCommand.accessKey,
    frozen: aCommand.frozen,
    index: length - 1,
    name: aCommand.name,
    windowId: aCommand.contentWindowId
  });
}

var observer = {
  observe: function(aSubject, aTopic, aData) {
    if (!GM_util.getEnabled()) return;

    switch (aTopic) {
      case 'document-element-inserted':
        var doc = aSubject;
        var win = doc && doc.defaultView;

        if (!doc || !win) break;

        // Listen for load event (which unlike DOMContentLoaded can't be done
        // globally), as some documents (e.g. images) don't fire DCL.
        win.addEventListener("load", contentLoad, true);

        // TODO:
        // Sometimes we get this notification twice with different windows but
        // identical documentURI/location.href. In one of those cases, the call
        // to sendSyncMessage will throw, and I can't find a way to detect which
        // notification is the correct one. if (win !== content) would also
        // exclude iframes.
        this.runScripts('document-start', win);
        break;
      case 'inner-window-destroyed':
        // Make sure we don't keep any window references around
        var windowId = aSubject.QueryInterface(Ci.nsISupportsPRUint64).data;
        delete gScriptRunners[windowId];
        break;
      default:
        dump("received unknown topic: " + aTopic + "\n");
    }
  },

  contentLoad: function(aEvent) {
    var contentWin = aEvent.target.defaultView;
    contentWin.removeEventListener("load", contentLoad, true);

    if (!GM_util.getEnabled()) return;
    this.runScripts('document-end', contentWin);
  },

  pagehide: function(aEvent) {
    var contentWin = aEvent.target.defaultView;
    var windowId = GM_util.windowId(contentWin);
    if (!windowId || !gScriptRunners[windowId]) return;

    // Small optimization: only send a notification if there's a menu command
    // for this window.
    if (!gScriptRunners[windowId].menuCommands.length) return;

    if (aEvent.persisted) {
      sendAsyncMessage("greasemonkey:toggle-menu-commands", {
        frozen: true,
        windowId: windowId
      });
    } else {
      sendAsyncMessage("greasemonkey:clear-menu-commands", {
        windowId: windowId
      });
    }
  },

  pageshow: function(aEvent) {
    var contentWin = aEvent.target.defaultView;
    var windowId = GM_util.windowId(contentWin);
    if (!windowId || !gScriptRunners[windowId]) return;

    if (!gScriptRunners[windowId].menuCommands.length) return;

    sendAsyncMessage("greasemonkey:toggle-menu-commands", {
      frozen: false,
      windowId: windowId
    });
  },

  runScripts: function(aRunWhen, aWrappedContentWin) {
    // See #1970
    // When content does (e.g.) history.replacestate() in an inline script,
    // the location.href changes between document-start and document-end time.
    // But the content can call replacestate() much later, too.  The only way to
    // be consistent is to ignore it.  Luckily, the  document.documentURI does
    // _not_ change, so always use it when deciding whether to run scripts.
    var url = aWrappedContentWin.document.documentURI;
    // But ( #1631 ) ignore user/pass in the URL.
    url = url.replace(gStripUserPassRegexp, '$1');

    if (!GM_util.isGreasemonkeyable(url)) return;

    var windowId = GM_util.windowId(aWrappedContentWin);
    if (gScriptRunners[windowId]) {
      // Update the window in case it changed, see the comment in observe().
      gScriptRunners[windowId].window = aWrappedContentWin;
    } else {
      gScriptRunners[windowId] = new ScriptRunner(aWrappedContentWin, url);
    }

    var response = sendSyncMessage('greasemonkey:scripts-for-url', {
      'url': url,
      'when': aRunWhen,
      'windowId': windowId
    });

    if (!response || !response[0]) return;
    var scripts = response[0].map(this.createScriptFromObject);
    gScriptRunners[windowId].injectScripts(scripts);
  },

  runDelayedScript: function(aMessage) {
    var windowId = aMessage.data.windowId;
    if (!gScriptRunners[windowId]) return;

    var script = this.createScriptFromObject(aMessage.data.script);
    gScriptRunners[windowId].injectScripts([script]);
  },

  runMenuCommand: function(aMessage) {
    var windowId = aMessage.data.windowId;
    if (!gScriptRunners[windowId]) return;

    var index = aMessage.data.index;
    var command = gScriptRunners[windowId].menuCommands[index];
    if (!command || !command.commandFunc) return;

    // Ensure |this| is set to the sandbox object inside the command function.
    command.commandFunc.call(null);
  },

  createScriptFromObject: function(aObject) {
    var script = Object.create(IPCScript.prototype);
    // TODO: better way for this? Object.create needs property descriptors.
    for (var key in aObject)
      script[key] = aObject[key];

    return script;
  }
}

var observerService = Cc['@mozilla.org/observer-service;1']
    .getService(Ci.nsIObserverService);
observerService.addObserver(observer, 'document-element-inserted', false);
observerService.addObserver(observer, 'inner-window-destroyed', false);

// Used for DOMContentLoaded here and load in observer.observe.
var contentLoad = observer.contentLoad.bind(observer);
addEventListener("DOMContentLoaded", contentLoad, true);

addEventListener("pagehide", observer.pagehide.bind(observer));
addEventListener("pageshow", observer.pageshow.bind(observer));

addMessageListener("greasemonkey:inject-script",
    observer.runDelayedScript.bind(observer));
addMessageListener("greasemonkey:menu-command-clicked",
    observer.runMenuCommand.bind(observer));
