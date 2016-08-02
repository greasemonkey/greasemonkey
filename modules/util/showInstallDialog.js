var EXPORTED_SYMBOLS = ['showInstallDialog'];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

Cu.import('chrome://greasemonkey-modules/content/util.js');
Cu.import('chrome://greasemonkey-modules/content/remoteScript.js');

var gWindowWatcher = Cc["@mozilla.org/embedcomp/window-watcher;1"]
    .getService(Ci.nsIWindowWatcher);


function showInstallDialog(aUrlOrRemoteScript, aBrowser, aRequest) {
  var rs = null;
  if ('string' == typeof aUrlOrRemoteScript) {
    rs = new RemoteScript(aUrlOrRemoteScript);
  } else {
    rs = aUrlOrRemoteScript;
  }

  var browser = aBrowser || GM_util.getBrowserWindow().gBrowser;
  var params = null;
  function openDialog(aScript) {
    params = [rs, browser, aScript];
    params.wrappedJSObject = params;
    // Don't set "modal" param, or this blocks.  Even though we'd prefer the
    // sort of behavior that gives us.
    gWindowWatcher.openWindow(
        /* aParent */ null,
        'chrome://greasemonkey/content/install.xul',
        /* aName */ null,
        'chrome,centerscreen,dialog,titlebar,resizable',
        params);
  }

  if (rs.script) {
    openDialog(rs.script);
  } else {
    rs.onScriptMeta(function(aRemoteScript, aType, aScript) {
      openDialog(aScript);
    });
  }

  rs.download(function(aSuccess, aType) {
    if (aRequest && 'script' == aType) {
      if (aSuccess) {
        aRequest.cancel(Components.results.NS_BINDING_ABORTED);
      } else {
        aRequest.cancel(Components.results.NS_BINDING_FAILED);
      }
      var browser = aRequest
          .QueryInterface(Ci.nsIHttpChannel)
          .notificationCallbacks.getInterface(Ci.nsILoadContext)
          .topFrameElement;
      browser.webNavigation.stop(Ci.nsIWebNavigation.STOP_ALL);
    } else {
      aRequest.resume();
    }
  });
}
