const EXPORTED_SYMBOLS = ['sniffGrants'];

Components.utils.import('resource://greasemonkey/util.js');

const APIS = [
    'GM_addStyle',
    'GM_deleteValue',
    'GM_getResourceText',
    'GM_getResourceURL',
    'GM_getValue',
    'GM_listValues',
    'GM_log',
    'GM_openInTab',
    'GM_registerMenuCommand',
    'GM_setClipboard',
    'GM_setValue',
    'GM_xmlhttpRequest',
    'unsafeWindow',
    ];

function sniffGrants(aScript) {
  var src = GM_util.getScriptSource(aScript);
  var grants = [];
  for (var i = 0, apiName = null; apiName = APIS[i]; i++) {
    if (-1 !== src.indexOf(apiName)) {
      grants.push(apiName);
    }
  }
  if (grants.length == 0) {
    return ['none'];
  }
  return grants;
}
