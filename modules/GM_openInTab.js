var EXPORTED_SYMBOLS = ['GM_openInTab'];

var Cu = Components.utils;
var Ci = Components.interfaces;
var Cc = Components.classes;

Cu.import('resource://gre/modules/Services.jsm');


function GM_openInTab(aFrame, aBaseUrl, aUrl, aInBackground) {
  var loadInBackground = ('undefined' == typeof aInBackground)
      ? null : !!aInBackground;

  // Resolve URL relative to the location of the content window.
  var baseUri = Services.io.newURI(aBaseUrl, null, null);
  var uri = Services.io.newURI(aUrl, null, baseUri);

  aFrame.sendAsyncMessage('greasemonkey:open-in-tab', {
    inBackground: loadInBackground,
    url: uri.spec,
  });
};
