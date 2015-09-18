'use strict';

const EXPORTED_SYMBOLS = [];

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("chrome://greasemonkey-modules/content/util.js");
Components.utils.import("chrome://greasemonkey-modules/content/prefmanager.js");

const types = Components.interfaces.nsIContentPolicy

function overrideReferer(subject) {
  if (!(subject instanceof Components.interfaces.nsIHttpChannel)) return;
  if (!(subject instanceof Components.interfaces.nsIPropertyBag)) return;

  var channel = subject; // instanceof -> automatic QI
  var referer;

  try {
    referer = channel.getProperty("greasemonkey:referer-override");
  } catch (ex) {
    // property not found
    return;
  }

  channel.setRequestHeader("Referer", referer, false);

}

function checkScriptRefresh(channel) {
  if (!channel.loadInfo) return;

  var type = channel.loadInfo.contentPolicyType;
  if (type != types.TYPE_DOCUMENT && type != types.TYPE_SUBDOCUMENT) return;

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

Services.obs.addObserver({
  observe: function(subject, topic, data) {
    overrideReferer(subject);
    checkScriptRefresh(subject);
  }
}, "http-on-modify-request", false);
