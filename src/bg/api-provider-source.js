/*
Generate the string source of the script-side API providers for a given
user script.  This source is concatenated with the script itself for injection.

This will be an anonymous and immediately called function which exports objects
to the global scope (the `this` object).  It ...
*/

const SUPPORTED_APIS = new Set([
    'GM.getResourceUrl',
    'GM.deleteValue', 'GM.getValue', 'GM.listValues', 'GM.setValue',
    'GM.xmlHttpRequest',
    'GM.openInTab',
    ]);


(function() {

function apiProviderSource(userScript) {
  const grants = userScript.grants;
  if (!grants || grants.length == 0
      || (grants.length == 1 && grants[0] == 'none')
  ) {
    return '/* No grants, no APIs. */';
  }

  let source = '(function() {\n';
  // A private copy of the script UUID which cannot be tampered with.
  source += 'const _uuid = "' + userScript.uuid + '";\n\n';

  if (grants.includes('GM.getResourceUrl')) {
    source += 'GM.getResourceUrl = ' + GM_getResourceUrl.toString() + ';\n\n';
  }

  if (grants.includes('GM.deleteValue')) {
    source += 'GM.deleteValue = ' + GM_deleteValue.toString() + ';\n\n';
  }
  if (grants.includes('GM.getValue')) {
    source += 'GM.getValue = ' + GM_getValue.toString() + ';\n\n';
  }
  if (grants.includes('GM.listValues')) {
    source += 'GM.listValues = ' + GM_listValues.toString() + ';\n\n';
  }
  if (grants.includes('GM.setValue')) {
    source += 'GM.setValue = ' + GM_setValue.toString() + ';\n\n';
  }

  if (grants.includes('GM.xmlHttpRequest')) {
    source += 'GM.xmlHttpRequest = ' + GM_xmlHttpRequest.toString() + ';\n\n';
  }

  if (grants.includes('GM.openInTab')) {
    source += 'GM.openInTab = ' + GM_openInTab.toString() + ';\n\n';
  }


  // TODO: GM_registerMenuCommand -- maybe.
  // TODO: GM_getResourceText -- maybe.

  source += '})();';
  return source;
}
window.apiProviderSource = apiProviderSource;


function GM_getResourceUrl(name) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      'name': 'ApiGetResourceBlob',
      'resourceName': name,
      'uuid': _uuid,
    }, result => {
      if (result) {
        resolve(URL.createObjectURL(result.blob))
      } else {
        reject(`No resource named "${name}"`);
      }
    });
  });
}


function GM_deleteValue(key) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      'key': key,
      'name': 'ApiDeleteValue',
      'uuid': _uuid,
    }, result => result ? resolve() : reject());
  });
}


function GM_getValue(key, defaultValue) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      'key': key,
      'name': 'ApiGetValue',
      'uuid': _uuid,
    }, result => {
      if (result !== undefined) {
        resolve(result)
      } else {
        resolve(defaultValue);
      }
    });
  });
}


function GM_listValues() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      'name': 'ApiListValues',
      'uuid': _uuid,
    }, result => resolve(result));
  });
}


function GM_setValue(key, value) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      'key': key,
      'name': 'ApiSetValue',
      'uuid': _uuid,
      'value': value,
    }, result => {
      if (result !== undefined) {
        resolve(result);
      } else {
        console.warn('set value failed:', chrome.runtime.lastError);
        reject();
      }
    });
  });
}


function GM_xmlHttpRequest(d) {
  if (!d) throw new Error('GM.xmlHttpRequest: Received no details.');
  if (!d.url) throw new Error('GM.xmlHttpRequest: Received no URL.');

  let url;
  try {
    url = new URL(d.url, location.href);
  } catch (e) {
    throw new Error(
        'GM.xmlHttpRequest: Could not understand the URL: ' + d.url
        + '\n' + e);
  }

  if (url.protocol != 'http:'
      && url.protocol != 'https:'
      && url.protocol != 'ftp:'
  ) {
    throw new Error('GM.xmlHttpRequest: Passed URL has bad protocol: ' + d.url);
  }

  let port = chrome.runtime.connect({name: 'UserScriptXhr'});
  port.onMessage.addListener(function(msg) {
    let o = msg.src == 'up' ? d.upload : d;
    let cb = o['on' + msg.type];
    if (cb) cb(msg.responseState);
  });

  let noCallbackDetails = {};
  Object.keys(d).forEach(k => {
    let v = d[k];
    noCallbackDetails[k] = v;
    if ('function' == typeof v) noCallbackDetails[k] = true;
  });
  noCallbackDetails.upload = {};
  d.upload && Object.keys(k => noCallbackDetails.upload[k] = true);
  noCallbackDetails.url = url.href;
  port.postMessage({name: 'open', details: noCallbackDetails});

  // TODO: Return an object which can be `.abort()`ed.
}

function GM_openInTab(url, openInBackground) {
  let _url;
  
  try {
    _url = new URL(url, location.href);
  } catch(e) {
    throw new Error(
        'GM.openInTab: Could not understand the URL: ' + url
        + '\n' + e);
  }

  chrome.runtime.sendMessage({
    'name': 'ApiOpenInTab',
    'url': _url.href,   
    'active': (openInBackground === false),
  });
}



})();
