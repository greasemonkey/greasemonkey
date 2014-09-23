let {utils: Cu, interfaces: Ci, classes: Cc} = Components;

Cu.import("resource://gre/modules/Services.jsm");

Cu.import('resource://greasemonkey/GM_setClipboard.js');
Cu.import("resource://greasemonkey/ipcscript.js");
Cu.import("resource://greasemonkey/miscapis.js");
Cu.import("resource://greasemonkey/sandbox.js");
Cu.import('resource://greasemonkey/util.js');


var gStripUserPassRegexp = new RegExp('(://)([^:/]+)(:[^@/]+)?@');
var gScriptRunners = {};

function ScriptRunner(aWindow) {
  this.window = aWindow;
}

ScriptRunner.prototype.injectScripts = function(aScripts) {
  try {
    this.window.QueryInterface(Ci.nsIDOMChromeWindow);
    // Never ever inject scripts into a chrome context window.
    return;
  } catch(e) {
    // Ignore, it's good if we can't QI to a chrome window.
  }

  for (var i = 0, script = null; script = aScripts[i]; i++) {
    var sandbox = createSandbox(script, this.window);
    runScriptInSandbox(script, sandbox);
  }
}

var observer = {
  observe: function(aSubject, aTopic, aData) {
    if (!GM_util.getEnabled()) return;

    switch (aTopic) {
      case 'document-element-inserted':
        var doc = aSubject;
        var win = doc && doc.defaultView;

        if (!doc || !win) break;

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
    if (!GM_util.getEnabled()) return;

    var contentWin = aEvent.target.defaultView;
    this.runScripts('document-end', contentWin);
  },

  runScripts: function(aRunWhen, aWrappedContentWin) {
    // See #1970
    // When content does (e.g.) history.replacestate() in an inline script,
    // the location.href changes between document-start and document-end time.
    // But the content can call replacestate() much later, too.  The only way to
    // be consistent is to ignore it.  Luckily, the  document.documentURI does
    // _not_ change, so always use it when deciding whether to run scripts.
    var url = aWrappedContentWin.document.documentURI
    // But ( #1631 ) ignore user/pass in the URL.
    url = url.replace(gStripUserPassRegexp, '$1');

    if (!GM_util.isGreasemonkeyable(url))
      return;

    var windowId = GM_util.windowId(aWrappedContentWin);
    if (gScriptRunners[windowId]) {
      // Update the window in case it changed, see the comment in observe().
      gScriptRunners[windowId].window = aWrappedContentWin;
    } else {
      gScriptRunners[windowId] = new ScriptRunner(aWrappedContentWin);
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

addEventListener("DOMContentLoaded", observer.contentLoad.bind(observer));
addEventListener("load", observer.contentLoad.bind(observer));

addMessageListener("greasemonkey:inject-script",
    observer.runDelayedScript.bind(observer));
