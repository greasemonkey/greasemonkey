Components.utils.import('resource://greasemonkey/util.js');

var EXPORTED_SYMBOLS = ['showInstallDialog'];

Components.utils.import('resource://greasemonkey/remoteScript.js');
var gWindowWatcher = Components
    .classes["@mozilla.org/embedcomp/window-watcher;1"]
    .getService(Components.interfaces.nsIWindowWatcher);

function showInstallDialog(aUrlOrRemoteScript, aBrowser, aService) {
  var rs = null;
  if ('string' == typeof aUrlOrRemoteScript) {
    rs = new RemoteScript(aUrlOrRemoteScript);
  } else {
    rs = aUrlOrRemoteScript;
  }

  var params = null;
  function openDialog() {
    // TODO: Find a better fix than this sloppy workaround.
    // Apparently this version of .openWindow() blocks; and called by the
    // "script meta data available" callback as this is, blocks the further
    // download of the script!
    var curriedOpenWindow = GM_util.hitch(
        null, gWindowWatcher.openWindow,
        /* aParent */ null,
        'chrome://greasemonkey/content/install.xul',
        /* aName */ null,
        'chrome,centerscreen,modal,dialog,titlebar,resizable',
        params);
    GM_util.timeout(0, curriedOpenWindow);
  }

  if (rs.script) {
    params = [rs, aBrowser, rs.script];
    params.wrappedJSObject = params;
    openDialog();
  } else {
    rs.onScriptMeta(function(aRemoteScript, aType, aScript) {
      params = [rs, aBrowser, aScript];
      params.wrappedJSObject = params;
      openDialog();
    });
  }

  rs.download(function(aSuccess, aType) {
    if (!aSuccess) {
      if ('script' == aType) {
        // Failure downloading script; browse to it.
        aService.ignoreNextScript();
        // TODO: Test this in Firefox 3.
        aBrowser.loadURI(rs.url, /* aReferrer */ null, /* aCharset */ null);
      }
    }
  });
}
