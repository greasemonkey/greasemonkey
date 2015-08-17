'use strict';

var EXPORTED_SYMBOLS = ['OnNewDocument'];

var Cu = Components.utils;

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('chrome://greasemonkey-modules/content/util.js');


const callbacks = new WeakMap()

function OnNewDocument(topWindow, callback) {
	callbacks.set(topWindow, callback)
}

var contentObserver = {
  observe: function (aSubject, aTopic, aData) {
    if (!GM_util.getEnabled()) return;

    switch (aTopic) {
      case 'document-element-inserted':
        var doc = aSubject;
        var win = doc && doc.defaultView;
        if (!doc || !win) return;
        let topWin = win.top;

        let frameCallback = callbacks.get(topWin);

        if(!frameCallback) return;

        frameCallback(win)

        break;
      default:
        dump('Content frame observed unknown topic: ' + aTopic + '\n');
    }
  }
};

Services.obs.addObserver(contentObserver, 'document-element-inserted', false);