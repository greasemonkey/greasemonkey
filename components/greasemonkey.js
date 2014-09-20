///////////////////////// Component-global "Constants" /////////////////////////

var DESCRIPTION = "GM_GreasemonkeyService";
var CONTRACTID = "@greasemonkey.mozdev.org/greasemonkey-service;1";
var CLASSID = Components.ID("{77bf3650-1cd6-11da-8cd6-0800200c9a66}");

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

Cu.import("resource://greasemonkey/third-party/getChromeWinForContentWin.js");
Cu.import("resource://greasemonkey/menucommand.js");
Cu.import("resource://greasemonkey/prefmanager.js");
Cu.import("resource://greasemonkey/sandbox.js");
Cu.import("resource://greasemonkey/sync.js");
Cu.import("resource://greasemonkey/util.js");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");


var gStartupHasRun = false;
var gScriptEndingRegexp = new RegExp('\\.user\\.js$');

var gFileProtocolHandler = Components
    .classes["@mozilla.org/network/protocol;1?name=file"]
    .getService(Ci.nsIFileProtocolHandler);
var gTmpDir = Components.classes["@mozilla.org/file/directory_service;1"]
    .getService(Components.interfaces.nsIProperties)
    .get("TmpD", Components.interfaces.nsIFile);

var gStripUserPassRegexp = new RegExp('(://)([^:/]+)(:[^@/]+)?@');

/////////////////////// Component-global Helper Functions //////////////////////

function contentLoad(aEvent) {
  var safeWin = aEvent.target.defaultView;
  safeWin.removeEventListener('DOMContentLoaded', contentLoad, true);
  safeWin.removeEventListener('load', contentLoad, true);
  GM_util.getService().runScripts('document-end', safeWin);
}

function isTempScript(uri) {
  if (uri.scheme != "file") return false;
  var file = gFileProtocolHandler.getFileFromURLSpec(uri.spec);
  return gTmpDir.contains(file, true);
}

function startup(aService) {
  if (gStartupHasRun) return;
  gStartupHasRun = true;

  var loader = Cc["@mozilla.org/moz/jssubscript-loader;1"]
      .getService(Ci.mozIJSSubScriptLoader);
  loader.loadSubScript("chrome://global/content/XPCNativeWrapper.js");
  loader.loadSubScript("chrome://greasemonkey/content/config.js");
  loader.loadSubScript("chrome://greasemonkey/content/third-party/mpl-utils.js");

  var observerService = Components.classes['@mozilla.org/observer-service;1']
     .getService(Components.interfaces.nsIObserverService);
  observerService.addObserver(aService, 'document-element-inserted', false);

  // Import this once, early, so that enqueued deletes can happen.
  Cu.import("resource://greasemonkey/util/enqueueRemoveFile.js");
}

/////////////////////////////////// Service ////////////////////////////////////

function service() {
  this.contentLoad = contentLoad;
  this.filename = Components.stack.filename;
  this.wrappedJSObject = this;
}

////////////////////////////////// Constants ///////////////////////////////////

service.prototype.classDescription = DESCRIPTION;
service.prototype.classID = CLASSID;
service.prototype.contractID = CONTRACTID;
service.prototype._xpcom_categories = [{
      category: "app-startup",
      entry: DESCRIPTION,
      value: CONTRACTID,
      service: true
    },{
      category: "content-policy",
      entry: CONTRACTID,
      value: CONTRACTID,
      service: true
    }];
service.prototype.QueryInterface = XPCOMUtils.generateQI([
      Ci.nsIObserver,
      Ci.nsISupports,
      Ci.nsISupportsWeakReference,
      Ci.nsIWindowMediatorListener,
      Ci.nsIContentPolicy
    ]);

/////////////////////////////// nsIContentPolicy ///////////////////////////////

service.prototype.shouldLoad = function(ct, cl, org, ctx, mt, ext) {
  var ret = Ci.nsIContentPolicy.ACCEPT;

  // Don't intercept anything when GM is not enabled.
  if (!GM_util.getEnabled()) {
    return ret;
  }

  // Don't interrupt the "view-source:" scheme (which is triggered if the link
  // in the error console is clicked), nor the "greasemonkey-script:" scheme.
  if ("view-source" == cl.scheme || "greasemonkey-script" == cl.scheme) {
    return ret;
  }

  // Do not install scripts when the origin URL "is a script".  See #1875
  if (org && org.spec.match(gScriptEndingRegexp)) {
    return ret;
  }

  if ((ct == Ci.nsIContentPolicy.TYPE_DOCUMENT
       || ct == Ci.nsIContentPolicy.TYPE_SUBDOCUMENT)
      && cl.spec.match(gScriptEndingRegexp)
  ) {
    if (!this._ignoreNextScript && !isTempScript(cl)) {
      GM_util.showInstallDialog(cl.spec, ctx, this);
      ret = Ci.nsIContentPolicy.REJECT_REQUEST;
    }

    this._ignoreNextScript = false;
  }

  return ret;
};

service.prototype.shouldProcess = function(ct, cl, org, ctx, mt, ext) {
  return Ci.nsIContentPolicy.ACCEPT;
};

///////////////////////////////// nsIObserver //////////////////////////////////

service.prototype.observe = function(aSubject, aTopic, aData) {
  switch (aTopic) {
    case 'app-startup':
    case 'profile-after-change':
      startup(this);
      break;
    case 'document-element-inserted':
      if (!GM_util.getEnabled()) break;
      var doc = aSubject;
      var win = doc && doc.defaultView;
      if (!doc || !win) break;

      win.addEventListener('DOMContentLoaded', contentLoad, true);
      win.addEventListener('load', contentLoad, true);
      this.runScripts('document-start', win);

      break;
  }
};

///////////////////////////// Greasemonkey Service /////////////////////////////

service.prototype._config = null;
service.prototype.__defineGetter__('config', function() {
  if (!this._config) {
    // First guarantee instantiation and existence.  (So that anything,
    // including stuff inside i.e. config._load(), can call
    // i.e. config._changed().)
    this._config = new Config();
    // Then initialize.
    this._config.initialize();
  }
  return this._config;
});

service.prototype.runScripts = function(aRunWhen, aWrappedContentWin) {
  // See #1970
  // When content does (e.g.) history.replacestate() in an inline script,
  // the location.href changes between document-start and document-end time.
  // But the content can call replacestate() much later, too.  The only way to
  // be consistent is to ignore it.  Luckily, the  document.documentURI does
  // _not_ change, so always use it when deciding whether to run scripts.
  var url = aWrappedContentWin.document.documentURI;
  // But ( #1631 ) ignore user/pass in the URL.
  url = url.replace(gStripUserPassRegexp, '$1');

  if (!GM_util.getEnabled() || !GM_util.isGreasemonkeyable(url)) return;

  if (GM_prefRoot.getValue('enableScriptRefreshing')) {
    this._config.updateModifiedScripts(aRunWhen, aWrappedContentWin);
  }

  var scripts = this.config.getMatchingScripts(function(script) {
    try {
      return GM_util.scriptMatchesUrlAndRuns(script, url, aRunWhen);
    } catch (e) {
      GM_util.logError(e, false, e.fileName, e.lineNumber);
      // See #1692; Prevent failures like that from being so severe.
      return false;
    }
  });
  if (scripts.length > 0) {
    this.injectScripts(scripts, url, aWrappedContentWin);
  }
};

service.prototype.ignoreNextScript = function() {
  this._ignoreNextScript = true;
};

service.prototype.injectScripts = function(
    scripts, url, wrappedContentWin
) {
  try {
    wrappedContentWin.QueryInterface(Ci.nsIDOMChromeWindow);
    // Never ever inject scripts into a chrome context window.
    return;
  } catch (e) {
    // Ignore, it's good if we can't QI to a chrome window.
  }

  var chromeWin = getChromeWinForContentWin(wrappedContentWin);

  for (var i = 0, script = null; script = scripts[i]; i++) {
    var sandbox = createSandbox(script, wrappedContentWin, url);
    runScriptInSandbox(script, sandbox);
  }
};

//////////////////////////// Component Registration ////////////////////////////

var NSGetFactory = XPCOMUtils.generateNSGetFactory([service]);
