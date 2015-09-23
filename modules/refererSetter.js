'use strict';

const EXPORTED_SYMBOLS = [];

Components.utils.import("resource://gre/modules/Services.jsm");

const observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);

Services.obs.addObserver({
  observe: function(subject, topic, data) {
    if(!(subject instanceof Components.interfaces.nsIHttpChannel))
      return;
    if(!(subject instanceof Components.interfaces.nsIPropertyBag))
      return;

    var channel = subject; // instanceof -> automatic QI
    var referer;
    
    try{
      referer = channel.getProperty("greasemonkey:referer-override");      
    } catch(ex) {
      // property not found
      return;
    }
    
    channel.setRequestHeader("Referer", referer, false);
  }
}, "http-on-modify-request", false);