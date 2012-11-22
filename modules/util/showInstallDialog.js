var EXPORTED_SYMBOLS = ['showInstallDialog'];

Components.utils.import('resource://greasemonkey/util.js');
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
  function openDialog(aScript) {
    params = [rs, aBrowser, aScript];
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
    if (!aSuccess && 'script' == aType) {
      // Failure downloading script; browse to it.
      aService.ignoreNextScript();
      aBrowser.loadURI(rs.url, /* aReferrer */ null, /* aCharset */ null);
    }
  });
}
