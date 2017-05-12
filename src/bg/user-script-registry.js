/*
The registry of installed user scripts.

The `UserScriptRegistry` object owns a set of UserScript objects (?), and
exports methods for discovering them.
*/

// Private implementation.
(function() {

// TODO: Order?
let userScripts = {};

const dbName = 'webbymonkey';
const dbVersion = 1;
const scriptStoreName = 'user-scripts';
const db = (function() {
  return new Promise((resolve, reject) => {
    let dbOpen = indexedDB.open(dbName, dbVersion);
    dbOpen.onerror = event => {
      // Note: can get error here if dbVersion is too low.
      console.error('Error opening user-scripts DB!', event);
      reject(event);
    };
    dbOpen.onsuccess = event => {
      resolve(event.target.result);
    };
    dbOpen.onupgradeneeded = event => {
      let db = event.target.result;
      db.onerror = event => {
        console.error('Error upgrading user-scripts DB!', event);
        reject(event);
      };
      let store = db.createObjectStore(scriptStoreName, {'keypath': 'uuid'});
      // The generated from @name and @namespace ID.
      store.createIndex('id', 'id', {'unique': true});
    };
  });
})();

///////////////////////////////////////////////////////////////////////////////

function install(downloader) {
  db.then(db => {
    try {
      let remoteScript = new RemoteUserScript(downloader.scriptDetails);
      let txn = db.transaction([scriptStoreName], "readonly");
      let store = txn.objectStore(scriptStoreName);
      let index = store.index('id');
      let req = index.get(remoteScript.id);
      txn.oncomplete = event => {
        let userScript = new EditableUserScript(req.result || {});
        userScript.updateFromDownloader(downloader);
        saveUserScript(userScript);

        // TODO: Notification?
      };
      txn.onerror = event => {
        console.error('Error looking up script!', event);
      };
    } catch (e) {
      console.error('at install(), db fail:', e);
    }
  });
}


function loadUserScripts() {
  db.then(db => {
    let txn = db.transaction([scriptStoreName], "readonly");
    let store = txn.objectStore(scriptStoreName);
    let req = store.getAll();
    req.onsuccess = event => {
      userScripts = {};
      event.target.result.forEach(details => {
        userScripts[details.uuid] = new EditableUserScript(details);
      });
    };
    req.onerror = event => {
      console.error('loadUserScripts() failure', event);
    };
  });
};


function onEditorSaved(message, sender, sendResponse) {
  let userScript = userScripts[message.uuid];
  if (!userScript) {
    console.error('Got save for UUID', message.uuid, 'but it does not exist.');
    return;
  }

  userScript.updateFromEditorSaved(message)
      .then(
          value => saveUserScript(userScript),
          reason => null);
};
window.onEditorSaved = onEditorSaved;


function onListUserScripts(message, sender, sendResponse) {
  let result = [];
  var userScriptIterator = UserScriptRegistry.scriptsToRunAt();
  for (let userScript of userScriptIterator) {
    result.push(userScript.details);
  }
  sendResponse(result);
};
window.onListUserScripts = onListUserScripts;


function onUserScriptGet(message, sender, sendResponse) {
  if (!message.uuid) {
    console.warn('UserScriptGet handler got no UUID.');
  } else if (!userScripts[message.uuid]) {
    console.warn(
      'UserScriptGet handler asked for non-installed UUID:', message.uuid);
  } else {
    sendResponse(userScripts[message.uuid].details);
  }
};
window.onUserScriptGet = onUserScriptGet;


function onUserScriptGetResourceBlob(message, sender, sendResponse) {
  if (!message.uuid) {
    console.warn('onUserScriptGetResourceBlob handler got no UUID.');
  } else if (!message.resourceName) {
      console.warn('onUserScriptGetResourceBlob handler got no resourceName.');
  } else if (!userScripts[message.uuid]) {
    console.warn(
      'onUserScriptGetResourceBlob handler asked for non-installed UUID:',
      message.uuid);
  } else {
    let userScript = userScripts[message.uuid];
    let blob = userScript.resourceBlobs[message.resourceName];
    sendResponse(blob);
  }
};
window.onUserScriptGetResourceBlob = onUserScriptGetResourceBlob;


function onUserScriptToggleEnabled(message, sender, sendResponse) {
  const userScript = userScripts[message.uuid];
  console.log(
    '>>> onUserScriptToggleEnabled;', message.uuid, userScript);
  userScript.enabled = !userScript.enabled;
  saveUserScript(userScript);
};
window.onUserScriptToggleEnabled = onUserScriptToggleEnabled;


function onUserScriptUninstall(message, sender, sendResponse) {
  db.then(db => {
    let txn = db.transaction([scriptStoreName], "readwrite");
    let store = txn.objectStore(scriptStoreName);
    let req = store.delete(message.uuid);
    req.onsuccess = event => {
      delete userScripts[message.uuid];
      sendResponse(null);
    };
    req.onerror = event => {
      console.error('onUserScriptUninstall() failure', event);
    };
  });
};
window.onUserScriptUninstall = onUserScriptUninstall;


function saveUserScript(userScript) {
  if (!(userScript instanceof EditableUserScript)) {
    throw new Error('Cannot save this type of UserScript object:' + userScript.constructor.name);
  }
  db.then((db) => {
    let txn = db.transaction([scriptStoreName], 'readwrite');
    txn.oncomplete = event => {
      // In case this was for an install, now that the user script is saved
      // to the object store, also put it in the in-memory copy.
      userScripts[userScript.uuid] = userScript;

      browser.runtime.sendMessage({
        'name': 'UserScriptChanged',
        'details': userScript.details,
        'parsedDetails': userScript.parsedDetails,
      });
    };
    txn.onerror = event => {
      console.warn('save transaction error?', event, event.target);
    };

    try {
      let store = txn.objectStore(scriptStoreName);
      let details = userScript.details;
      details.id = userScript.id;  // Secondary index on calculated value.
      store.put(details, userScript.uuid);
    } catch (e) {
      // If these fail, they fail invisibly unless we catch and log (!?).
      console.error('when saving', userScript, e);
      return;
    }
  });
}


// Generate user scripts to run at `urlStr`; all if no URL provided.
function* scriptsToRunAt(urlStr=null) {
  if (false === getGlobalEnabled()) return;
  let url = urlStr && new URL(urlStr);
  for (let uuid in userScripts) {
    let userScript = userScripts[uuid];
    if (!userScript.enabled) continue;
    if (url && !userScript.runsAt(url)) continue;
    yield userScript;
  }
}


loadUserScripts();


// Export public API.
window.UserScriptRegistry = {
  'install': install,
  'scriptsToRunAt': scriptsToRunAt,
};

})();
