var EXPORTED_SYMBOLS = ['channelFromUri'];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");

var ioService = Cc['@mozilla.org/network/io-service;1']
    .getService(Ci.nsIIOService);


function channelFromUri(aUri) {
  let loadInfo = null;
  if(arguments.length > 1)
    loadInfo = arguments[1];
  
  let trigger = loadInfo && loadInfo.triggeringPrincipal; 
  let sourceDoc = loadInfo && loadInfo.loadingDocument;
  let requestType = loadInfo && loadInfo.externalContentPolicyType || Ci.nsIContentPolicy.TYPE_OTHER; 
    
  
  if (ioService.newChannelFromURI2) {
    return ioService.newChannelFromURI2(
        aUri, sourceDoc, Services.scriptSecurityManager.getSystemPrincipal(),
        trigger , Ci.nsILoadInfo.SEC_NORMAL, requestType);
  } else {
    return ioService.newChannelFromURI(aUri);
  }
}
