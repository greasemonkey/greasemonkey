// This module is responsible for detecting user scripts that are loaded by
// some means OTHER than HTTP (which the http-on-modify-request observer
// handles), i.e. local files.

var EXPORTED_SYMBOLS = [];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;
var Cr = Components.results;

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

Cu.import('chrome://greasemonkey-modules/content/util.js');

var gHaveDoneInit = false;
var gScriptEndingRegexp = new RegExp('\\.user\\.js$');

XPCOMUtils.defineLazyServiceGetter(
    this, 'cpmm',
    '@mozilla.org/childprocessmessagemanager;1', 'nsIMessageSender');

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

    // Ignore everything that isn't a file:// .
    if ('file' != aContentURI.scheme) {
      return ACCEPT;
    }
    // Ignore everything that isn't a top-level document navigation.
    if (aContentType != Ci.nsIContentPolicy.TYPE_DOCUMENT) {
      return ACCEPT;
    }
    // Ignore everything when GM is not enabled.
    if (!GM_util.getEnabled()) {
      return ACCEPT;
    }
    // Ignore everything that isn't a user script.
    if (!aContentURI.spec.match(gScriptEndingRegexp)) {
      return ACCEPT;
    }
    // Ignore temporary files, e.g. "Show script source".
    var tmpResult = cpmm.sendSyncMessage(
        'greasemonkey:url-is-temp-file', {'url': aContentURI.spec});
    if (tmpResult.length && tmpResult[0]) {
      return ACCEPT;
    }

    cpmm.sendAsyncMessage(
        'greasemonkey:script-install', {'url': aContentURI.spec});

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

////////////////////////////////////////////////////////////////////////////////

if (!gHaveDoneInit) {
  gHaveDoneInit = true;
  InstallPolicy.init();
}
