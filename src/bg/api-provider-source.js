/*
Generate the string source of the script-side API providers for a given
user script.  This source is concatenated with the script itself for injection.

This will be an anonymous and immediately called function which exports objects
to the global scope (the `this` object).  It ...
*/

const SUPPORTED_APIS = new Set([
    'GM.getResourceUrl',
    'GM.deleteValue', 'GM.getValue', 'GM.listValues', 'GM.setValue',
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

  // TODO: Everything else.

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

})();
