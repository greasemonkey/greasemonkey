Components.utils.import('resource://greasemonkey/prefmanager.js');
Components.utils.import('resource://greasemonkey/util.js');

const EXPORTED_SYMBOLS = ['checkCoralCache'];

const XMLHttpRequest = Components.Constructor(
    '@mozilla.org/xmlextras/xmlhttprequest;1');

var gCheckIsRunning = false;

function checkCoralCache(msg) {
  if (!gCheckIsRunning) {
    gCheckIsRunning = true;
    var req = new XMLHttpRequest();
    req.onerror = GM_util.hitch(null, onError, req);
    req.onload = GM_util.hitch(null, onLoad, req);
    req.open('get', 'http://userscripts.org/scripts/source/1.meta.js');
    req.send();
  }

  return GM_prefRoot.getValue('coralCacheWorks');
}

function onError(aReq, aEvent) {
  GM_prefRoot.setValue('coralCacheWorks', false);
  gCheckIsRunning = false;
}

function onLoad(aReq, aEvent) {
  if (200 !== aReq.status) return onError();
  if (-1 == aReq.responseText.indexOf('UserScript')) return onError();

  GM_prefRoot.setValue('coralCacheWorks', true);
  gCheckIsRunning = false;
}
