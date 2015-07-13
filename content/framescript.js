// The frame script for Electrolysis (e10s) compatible injection.
//   See: https://developer.mozilla.org/en-US/Firefox/Multiprocess_Firefox

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

Cu.import('chrome://greasemonkey-modules/content/GM_setClipboard.js');
Cu.import('chrome://greasemonkey-modules/content/installPolicy.js');
Cu.import('chrome://greasemonkey-modules/content/ipcscript.js');
Cu.import('chrome://greasemonkey-modules/content/menucommand.js');
Cu.import('chrome://greasemonkey-modules/content/miscapis.js');
Cu.import('chrome://greasemonkey-modules/content/sandbox.js');
Cu.import('chrome://greasemonkey-modules/content/scriptProtocol.js');
Cu.import('chrome://greasemonkey-modules/content/util.js');

// \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ //

var gScope = this;
var gStripUserPassRegexp = new RegExp('(://)([^:/]+)(:[^@/]+)?@');

// \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ //

function ContentObserver() {
}


ContentObserver.prototype.QueryInterface = XPCOMUtils.generateQI([
    Ci.nsIObserver]);


ContentObserver.prototype.observe = function(aSubject, aTopic, aData) {
  if (!GM_util.getEnabled()) return;

  switch (aTopic) {
    case 'document-element-inserted':
      if (!GM_util.getEnabled()) return;

      var doc = aSubject;
      var win = doc && doc.defaultView;
      if (!doc || !win) return;
      if (win.top !== content) return;

      var url = doc.documentURI;
      if (!GM_util.isGreasemonkeyable(url)) return;

      // Listen for whichever kind of load event arrives first.
      win.addEventListener('DOMContentLoaded', contentLoad, true);
      win.addEventListener('load', contentLoad, true);

      runScripts('document-start', win);
      break;
    default:
      dump('Content frame observed unknown topic: ' + aTopic + '\n');
  }
};

// \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ //

function blankLoad(aEvent) {
  var contentWin = aEvent.target.defaultView;
  if (contentWin.location.href.match(/^about:blank/)) {
    // #1696: document-element-inserted doesn't see about:blank
    runScripts('document-end', contentWin);
  }
}


function contentLoad(aEvent) {
  var contentWin = aEvent.target.defaultView;

  // Now that we've seen any first load event, stop listening for any more.
  contentWin.removeEventListener('DOMContentLoaded', contentLoad, true);
  contentWin.removeEventListener('load', contentLoad, true);

  runScripts('document-end', contentWin);
}


function createScriptFromObject(aObject) {
  var script = Object.create(IPCScript.prototype);
  // TODO: better way for this? Object.create needs property descriptors.
  for (var key in aObject) {
    script[key] = aObject[key];
  }
  return script;
};


function injectDelayedScript(aMessage) {
  var windowId = aMessage.data.windowId;
  var windowMediator = Components
      .classes['@mozilla.org/appshell/window-mediator;1']
      .getService(Components.interfaces.nsIWindowMediator);
  var win = windowMediator.getOuterWindowWithId(windowId);

  if (!win) {
    dump('Couldn\'t find window with (outer?) ID ' + windowId + '!\n');
  } else {
     var script = createScriptFromObject(aMessage.data.script);
    injectScripts([script], win);
  }
};


function injectScripts(aScripts, aContentWin) {
  try {
    aContentWin.QueryInterface(Ci.nsIDOMChromeWindow);
    // Never ever inject scripts into a chrome context window.
    return;
  } catch(e) {
    // Ignore, it's good if we can't QI to a chrome window.
  }

  var url = urlForWin(aContentWin);
  var winIsTop = windowIsTop(aContentWin);

  for (var i = 0, script = null; script = aScripts[i]; i++) {
    if (script.noframes && !winIsTop) continue;
    var sandbox = createSandbox(script, aContentWin, url, gScope);
    runScriptInSandbox(script, sandbox);
  }
}


function loadFailedScript(aMessage) {
  var url = aMessage.data.url;
  var loadFlags = Ci.nsIWebNavigation.LOAD_FLAGS_NONE;
  var referer = aMessage.data.referer
      && GM_util.uriFromUrl(aMessage.data.referer);
  var postData = null;
  var headers = null;

  var webNav = docShell.QueryInterface(Ci.nsIWebNavigation);

  ignoreNextScript();
  webNav.loadURI(url, loadFlags, referer, postData, headers);
}


function runScripts(aRunWhen, aContentWin) {
  var url = urlForWin(aContentWin);
  if (!GM_util.isGreasemonkeyable(url)) return;

  var response = sendSyncMessage(
    'greasemonkey:scripts-for-url', {
      'url': url,
      'when': aRunWhen,
      'windowId': GM_util.windowId(aContentWin, 'outer'),
    });
  if (!response || !response[0]) return;

  var scripts = response[0].map(createScriptFromObject);
  injectScripts(scripts, aContentWin);
}


function urlForWin(aContentWin) {
  // See #1970
  // When content does (e.g.) history.replacestate() in an inline script,
  // the location.href changes between document-start and document-end time.
  // But the content can call replacestate() much later, too.  The only way to
  // be consistent is to ignore it.  Luckily, the  document.documentURI does
  // _not_ change, so always use it when deciding whether to run scripts.
  var url = aContentWin.document.documentURI;
  // But ( #1631 ) ignore user/pass in the URL.
  return url.replace(gStripUserPassRegexp, '$1');
}


function windowIsTop(aContentWin) {
  try {
    aContentWin.QueryInterface(Ci.nsIDOMWindow);
    if (aContentWin.frameElement) return false;
  } catch (e) {
    var url = 'unknown';
    try {
      url = aContentWin.location.href;
    } catch (e) { }
    // Ignore non-DOM-windows.
    dump('Could not QI window to nsIDOMWindow at\n' + url + ' ?!\n');
  }
  return true;
};

// \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ //

addEventListener('DOMContentLoaded', blankLoad);

addMessageListener('greasemonkey:inject-delayed-script', injectDelayedScript);
addMessageListener('greasemonkey:load-failed-script', loadFailedScript);
addMessageListener('greasemonkey:menu-command-list', function(aMessage) {
  MenuCommandListRequest(content, aMessage);
});
addMessageListener('greasemonkey:menu-command-run', function(aMessage) {
  MenuCommandRun(content, aMessage);
});

var contentObserver = new ContentObserver();
Services.obs.addObserver(contentObserver, 'document-element-inserted', false);
addEventListener('unload', function() {
  Services.obs.removeObserver(contentObserver, 'document-element-inserted');
}, false);

(function() {
  initInstallPolicy();
  initScriptProtocol();
})();
