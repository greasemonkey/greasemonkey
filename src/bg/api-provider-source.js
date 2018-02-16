/*
Generate the string source of the script-side API providers for a given
user script.  This source is concatenated with the script itself for injection.

This will be an anonymous and immediately called function which exports objects
to the global scope (the `this` object).  It ...
*/

const SUPPORTED_APIS = new Set([
    'GM.deleteValue', 'GM.getValue', 'GM.listValues', 'GM.setValue',
    'GM.getResourceUrl',
    'GM.notification',
    'GM.openInTab',
    'GM.setClipboard',
    'GM.xmlHttpRequest',
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
  // A private copy of the localization function, used by some of the API functions.
  source += 'const _ = ' + _.toString() + ';\n\n';

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

  if (grants.includes('GM.getResourceUrl')) {
    source += 'GM.getResourceUrl = ' + GM_getResourceUrl.toString() + ';\n\n';
  }

  if (grants.includes('GM.notification')) {
    source += 'GM.notification = ' + GM_notification.toString() + ';\n\n';
  }

  if (grants.includes('GM.openInTab')) {
    source += 'GM.openInTab = ' + GM_openInTab.toString() + ';\n\n';
  }

  if (grants.includes('GM.setClipboard')) {
    source += 'GM.setClipboard = ' + GM_setClipboard.toString() + ';\n\n';
  }

  if (grants.includes('GM.xmlHttpRequest')) {
    source += 'GM.xmlHttpRequest = ' + GM_xmlHttpRequest.toString() + ';\n\n';
  }

  // TODO: GM_registerMenuCommand -- maybe.
  // TODO: GM_getResourceText -- maybe.

  source += '})();';
  return source;
}
window.apiProviderSource = apiProviderSource;


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


function GM_notification(text, title, image, onclick) {
  let opt;

  if (typeof text == 'object') {
    opt = text;
    if (typeof title == 'function') opt.ondone = title;
  } else {
    opt = { title, text, image, onclick };
  }

  if (typeof opt.text != 'string') {
    throw new Error(_('GM.notification: "text" must be a string'));
  }

  if (typeof opt.title != 'string') opt.title = 'Greasemonkey';
  if (typeof opt.image != 'string') opt.image = 'skin/icon.svg';

  let port = chrome.runtime.connect({name: 'UserScriptNotification'});
  port.onMessage.addListener(msg => {
    const msgType = msg.type;
    if (typeof opt[msgType] == 'function') opt[msgType]();
  });
  port.postMessage({
    'details': {
      'title': opt.title,
      'text': opt.text,
      'image': opt.image
    },
    'name': 'create',
    'uuid': _uuid,
  });
}


function GM_openInTab(url, openInBackground) {
  let objURL;

  try {
    objURL = new URL(url, location.href);
  } catch(e) {
    throw new Error(_('GM.openInTab: Could not understand the URL: $1', url));
  }

  chrome.runtime.sendMessage({
    'active': (openInBackground === false),
    'name': 'ApiOpenInTab',
    'url': objURL.href,
    'uuid': _uuid,
  });
}


function GM_setClipboard(text) {
  // TODO: This.  The check only works background side, but this implementation
  // relies on clipboardWrite permission leaking to the content script so we
  // couldn't block a script from doing this directly, anyway.
  //checkApiCallAllowed('GM.setClipboard', message.uuid);

  function onCopy(event) {
    document.removeEventListener('copy', onCopy, true);

    event.stopImmediatePropagation();
    event.preventDefault();

    event.clipboardData.setData('text/plain', text);
  }

  document.addEventListener('copy', onCopy, true);
  document.execCommand('copy');
}


function GM_xmlHttpRequest(d) {
  if (!d) throw new Error(_('GM.xmlHttpRequest: Received no details.'));
  if (!d.url) throw new Error(_('GM.xmlHttpRequest: Received no URL.'));

  let url;
  try {
    url = new URL(d.url, location.href);
  } catch (e) {
    throw new Error(
        _('GM.xmlHttpRequest: Could not understand the URL: $1\n$2', d.url, e));
  }

  if (url.protocol != 'http:'
      && url.protocol != 'https:'
      && url.protocol != 'ftp:'
  ) {
    throw new Error(
        _('GM.xmlHttpRequest: Passed URL has bad protocol: $1', d.url));
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
  port.postMessage({
    'details': noCallbackDetails,
    'name': 'open',
    'uuid': _uuid,
  });

  // TODO: Return an object which can be `.abort()`ed.
}

})();
