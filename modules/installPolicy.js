// This module is responsible for observing HTTP traffic, detecting when a user
// script is loaded (e.g. a link to one is clicked), and launching the install
// dialog instead.
var EXPORTED_SYMBOLS = ['passNextScript', 'initInstallPolicy'];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;
var Cr = Components.results;

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

Cu.import('chrome://greasemonkey-modules/content/util.js');

var gHaveDoneInit = false;
var gBlockNextScript = false;
var gPassNextScript = false;
var gScriptEndingRegexp = new RegExp('\\.user\\.js$');

////////////////////////////////////////////////////////////////////////////////

function passNextScript() {
  gPassNextScript = true;
}

function initInstallPolicy() {
  if (gHaveDoneInit) return;
  gHaveDoneInit = true;
  InstallPolicy.init();
}

////////////////////////////////////////////////////////////////////////////////

var InstallPolicy = {
  _classDescription: 'Greasemonkey Script Install Policy',
  _classID: Components.ID('c03c575c-e87e-4a0f-b88d-8be090116a0c'),
  _contractID: '@greasemonkey.mozdev.org/greasemonkey-install-policy;1',

  init: function() {
    try {
      var registrar = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);
      registrar.registerFactory(
          this._classID, this._classDescription, this._contractID, this);
    } catch (e) {
      if ('NS_ERROR_FACTORY_EXISTS' == e.name) {
        // No-op, ignore these.  But why do they happen!?
      } else {
        dump('Error registering InstallPolicy factory:\n' + e + '\n');
      }
      return;
    }

    var catMan = Cc["@mozilla.org/categorymanager;1"]
        .getService(Ci.nsICategoryManager);
    catMan.addCategoryEntry(
        'content-policy', this._contractID, this._contractID, false, true);
  },

  QueryInterface: XPCOMUtils.generateQI([
      Ci.nsIContentPolicy,
      Ci.nsIFactory,
      Ci.nsISupportsWeakReference
      ]),

/////////////////////////////// nsIContentPolicy ///////////////////////////////

  shouldLoad: function(aContentType, aContentURI, aOriginURI, aContext) {
    var ACCEPT = Ci.nsIContentPolicy.ACCEPT;
    var REJECT = Ci.nsIContentPolicy.REJECT_REQUEST;

    // Don't interrupt the "view-source:" scheme (which is triggered if the link
    // in the error console is clicked), nor the "greasemonkey-script:" scheme.
    // Never break chrome.
    if ("view-source" == aContentURI.scheme
        || "chrome" == aContentURI.scheme
        || "greasemonkey-script" == aContentURI.scheme) {
      return ACCEPT;
    }
    // Ignore everything that isn't a top-level document navigation.
    if (aContentType != Ci.nsIContentPolicy.TYPE_DOCUMENT) {
      return ACCEPT;
    }
    // Don't intercept anything when GM is not enabled.
    if (!GM_util.getEnabled()) {
      return ACCEPT;
    }

    // Do not install scripts when the origin URL "is a script".  See #1875
    if (aOriginURI && aOriginURI.spec.match(gScriptEndingRegexp)) {
      return ACCEPT;
    }

    if (!aContentURI.spec.match(gScriptEndingRegexp)) {
      return ACCEPT;
    }

    if (gPassNextScript) {
      // E.g. Detected HTML content so forced re-navigation.
      gPassNextScript = false;
      return ACCEPT;
    }

    // TODO: Remove this when e10s is always enabled.
    // See #2292
    // Recent Firefoxen with e10s on, when opening a file:/// .user.js will
    // trigger the install policy twice.  Block the second one.
    if (gBlockNextScript) {
      gBlockNextScript = false;
      return REJECT;
    }
    if (!Services.appinfo.browserTabsRemoteAutostart
        && aContentURI.scheme == 'file') {
      gBlockNextScript = true;
    }

    // Ignore temporary files, e.g. "Show script source".
    var messageManager = GM_util.findMessageManager(aContext);
    var cpmm = Services.cpmm ? Services.cpmm : messageManager;
    var tmpResult = cpmm && cpmm.sendSyncMessage(
        'greasemonkey:url-is-temp-file', {'url': aContentURI.spec});
    if (tmpResult.length && tmpResult[0]) {
      return ACCEPT;
    }

    if (!messageManager) {
      dump('ERROR ignoring script ' + aContentURI.spec + ' because no content'
        + ' message manager could be located from ' + aContext + '\n');
      return ACCEPT;
    }

    messageManager.sendAsyncMessage('greasemonkey:script-install', {
      'referer': aOriginURI ? aOriginURI.spec : null,
      'url': aContentURI.spec,
    });

    return REJECT;
  },

  shouldProcess: function() {
    return Ci.nsIContentPolicy.ACCEPT;
  },

////////////////////////////////// nsIFactory //////////////////////////////////

  createInstance: function(outer, iid) {
    if (outer) {
      throw Cr.NS_ERROR_NO_AGGREGATION;
    }
    return this.QueryInterface(iid);
  },

};
