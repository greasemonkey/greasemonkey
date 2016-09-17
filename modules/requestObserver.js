'use strict';

var EXPORTED_SYMBOLS = [];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;
var Cr = Components.results;

Cu.import("resource://gre/modules/Services.jsm");

Cu.import("chrome://greasemonkey-modules/content/util.js");
Cu.import("chrome://greasemonkey-modules/content/prefmanager.js");

var gDisallowedSchemes = {
    'chrome': 1, 'greasemonkey-script': 1, 'view-source': 1};
var gScriptEndingRegexp = new RegExp('\\.user\\.js$');
var gContentTypes = Ci.nsIContentPolicy;

// \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ //

function checkScriptRefresh(channel) {
  // .loadInfo is part of nsiChannel -> implicit QI needed
  if (!(channel instanceof Components.interfaces.nsIChannel)) return;
  if (!channel.loadInfo) return;

  // See http://bugzil.la/1182571
  var type = channel.loadInfo.externalContentPolicyType
      ? channel.loadInfo.externalContentPolicyType
      : channel.loadInfo.contentPolicyType;

  // only check for updated scripts when tabs/iframes are loaded
  if (type != gContentTypes.TYPE_DOCUMENT
      && type != gContentTypes.TYPE_SUBDOCUMENT
  ) {
    return;
  }

  // forward compatibility: https://bugzilla.mozilla.org/show_bug.cgi?id=1124477
  var browser = channel.loadInfo.topFrameElement;

  if (!browser && channel.notificationCallbacks) {
    // current API: https://bugzilla.mozilla.org/show_bug.cgi?id=1123008#c7
    var loadCtx = channel.notificationCallbacks.QueryInterface(
        Components.interfaces.nsIInterfaceRequestor).getInterface(
        Components.interfaces.nsILoadContext);
    browser = loadCtx.topFrameElement;
  }

  var windowId = channel.loadInfo.innerWindowID;

  GM_util.getService().scriptRefresh(channel.URI.spec, windowId, browser);
}

// \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ //

function installObserver(aSubject, aTopic, aData) {
  // When observing a new request, inspect it to determine if it should be
  // a user script install.  If so, abort and restart as an install rather
  // than a navigation.
  if (!GM_util.getEnabled()) {
    return;
  }

  var channel = aSubject.QueryInterface(Ci.nsIChannel);
  if (!channel || !channel.loadInfo) {
    return;
  }

  // See http://bugzil.la/1182571
  var type = channel.loadInfo.externalContentPolicyType
      || channel.loadInfo.contentPolicyType;
  if (type != gContentTypes.TYPE_DOCUMENT) {
    return;
  }

  if (channel.URI.scheme in gDisallowedSchemes) {
    return;
  }

  try {
    var httpChannel = channel.QueryInterface(Ci.nsIHttpChannel);
    if ('POST' == httpChannel.requestMethod) {
      return;
    }
  } catch (e) {
    // Ignore completely, e.g. file:/// URIs.
  }

  if (!channel.URI.spec.match(gScriptEndingRegexp)) {
    return;
  }

  // We've done an early return above for all non-user-script navigations.  If
  // execution has proceeded to this point, we want to cancel the existing
  // request (i.e. navigation) and instead start a script installation for
  // this same URI.
  try {
    var request = channel.QueryInterface(Ci.nsIRequest);
    // See #1717
    if (request.isPending()) {
      request.suspend();
    }

    var browser = channel
        .QueryInterface(Ci.nsIHttpChannel)
        .notificationCallbacks
        .getInterface(Ci.nsILoadContext)
        .topFrameElement;

    GM_util.showInstallDialog(channel.URI.spec, browser, request);
  } catch (e) {
    dump('Greasemonkey could not do script install!\n'+e+'\n');
    // Ignore.
    return;
  }
}

// \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ //

Services.obs.addObserver({
  observe: function(aSubject, aTopic, aData) {
    try {
      installObserver(aSubject, aTopic, aData);
    } catch (e) {
      dump('Greasemonkey install observer failed:\n' + e + '\n');
    }
    try {
      checkScriptRefresh(aSubject);
    } catch (e) {
      dump('Greasemonkey refresh observer failed:\n' + e + '\n');
    }
  }
}, "http-on-modify-request", false);
