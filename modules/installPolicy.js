// This module is responsible for observing HTTP traffic, detecting when a user
// script is loaded (e.g. a link to one is clicked), and launching the install
// dialog instead.
var EXPORTED_SYMBOLS = ['ignoreNextScript', 'initInstallPolicy'];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;
var Cr = Components.results;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

Cu.import('resource://greasemonkey/util.js');

var gHaveDoneInit = false;
var gIgnoreNextScript = false;
var gScriptEndingRegexp = new RegExp('\\.user\\.js$');

////////////////////////////////////////////////////////////////////////////////

function ignoreNextScript() {
  gIgnoreNextScript = true;
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
    var ret = Ci.nsIContentPolicy.ACCEPT;

    // Don't intercept anything when GM is not enabled.
    if (!GM_util.getEnabled()) {
      return ret;
    }

    // Don't interrupt the "view-source:" scheme (which is triggered if the link
    // in the error console is clicked), nor the "greasemonkey-script:" scheme.
    if ("view-source" == aContentURI.scheme
        || "greasemonkey-script" == aContentURI.scheme) {
      return ret;
    }

    // Do not install scripts when the origin URL "is a script".  See #1875
    if (aOriginURI && aOriginURI.spec.match(gScriptEndingRegexp)) {
      return ret;
    }

    if (aContentType != Ci.nsIContentPolicy.TYPE_DOCUMENT
        && aContentType != Ci.nsIContentPolicy.TYPE_SUBDOCUMENT) {
      return ret;
    }

    if (!aContentURI.spec.match(gScriptEndingRegexp)) {
      return ret;
    }

    var messageManager = GM_util.findMessageManager(aContext);

    var tmpResult = messageManager.sendSyncMessage(
        'greasemonkey:url-is-temp-file', {'url': aContentURI.spec});
    if (tmpResult.length && tmpResult[0]) {
      return ret;
    }

    if (!gIgnoreNextScript) {
      if (!messageManager) {
        dump('ERROR ignoring script ' + aContentURI.spec + ' because no content'
            + ' message manager could be located from ' + aContext + '\n');
      } else {
        ret = Ci.nsIContentPolicy.REJECT_REQUEST;
        messageManager.sendAsyncMessage('greasemonkey:script-install', {
          'referer': aOriginURI.spec,
          'url': aContentURI.spec,
        });
      }
    }

    gIgnoreNextScript = false;
    return ret;
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
