var EXPORTED_SYMBOLS = ['GM_openInTab'];

var Cu = Components.utils;
var Ci = Components.interfaces;
var Cc = Components.classes;

Cu.import('resource://gre/modules/Services.jsm');


function GM_openInTab(aFrame, aBaseUrl, aUrl, aOptions) {
  var loadInBackground = ("undefined" == typeof aOptions)
      ? null
      : ("undefined" == typeof aOptions.active)
        ? ("object" == typeof aOptions) ? null : !!aOptions
        : !aOptions.active;      
  var insertRelatedAfterCurrent = ("undefined" == typeof aOptions)
      ? null
      : ("undefined" == typeof aOptions.insert) ? null : !!aOptions.insert;

  // Resolve URL relative to the location of the content window.
  var baseUri = Services.io.newURI(aBaseUrl, null, null);
  var uri = Services.io.newURI(aUrl, null, baseUri);

  aFrame.sendAsyncMessage('greasemonkey:open-in-tab', {
    afterCurrent: insertRelatedAfterCurrent,
    inBackground: loadInBackground,
    url: uri.spec,
  });
};
