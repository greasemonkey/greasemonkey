/*
Generate the string source of the script-side API providers for a given
user script.  This source is concatenated with the script itself for injection.

This will be an anonymous and immediately called function which exports objects
to the global scope (the `this` object).  It ...
*/

const SUPPORTED_APIS = new Set([
    'GM.getResourceURL',
    ]);


(function() {

function apiProviderSource(userScript) {
  if (!userScript.grants || userScript.grants.length == 0
      || (userScript.grants.length == 1 && userScript.grants[0] == 'none')
  ) {
    return '/* No grants, no APIs. */';
  }

  let source = '(function() {\n\n';

  if (userScript.grants.includes('GM_getResourceURL')) {
    source += 'GM.getResourceURL = ' + GM_getResourceURL.toString() + ';\n\n';
  }

  // TODO: Everything else.

  source += '})();';
  return source;
}
window.apiProviderSource = apiProviderSource;


function GM_getResourceURL(name) {
  return new Promise((resolve, reject) => {
    browser.runtime.sendMessage({
      'name': 'UserScriptGetResourceBlob',
      'resourceName': name,
      'uuid': GM_info.uuid,
    }).then(result => {
      if (result) {
        resolve(URL.createObjectURL(result))
      } else {
        reject(`No resource named "${name}"`);
      }
    });
  });
}

})();
