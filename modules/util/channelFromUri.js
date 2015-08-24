var EXPORTED_SYMBOLS = ['channelFromUri'];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");

var ioService = Cc['@mozilla.org/network/io-service;1']
    .getService(Ci.nsIIOService);


function channelFromUri(aUri) {
  if (ioService.newChannelFromURI2) {
    return ioService.newChannelFromURI2(
        aUri, null, Services.scriptSecurityManager.getSystemPrincipal(),
        null, Ci.nsILoadInfo.SEC_NORMAL, Ci.nsIContentPolicy.TYPE_OTHER);
  } else {
    return ioService.newChannelFromURI(aUri);
  }
}
