/*
The registry of installed user scripts.

The `UserScriptRegistry` object owns a set of UserScript objects, and
exports methods for discovering them and their details.
*/

// Private implementation.
(function() {

// TODO: Order?
let userScripts = {};

const dbName = 'greasemonkey';
const dbVersion = 1;
const scriptStoreName = 'user-scripts';


async function openDb() {
  if (navigator.storage && navigator.storage.persist) {
    await navigator.storage.persist();
  }

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
}


///////////////////////////////////////////////////////////////////////////////

async function installFromDownloader(downloader) {
  let db = await openDb();
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
      db.close();
      // TODO: Notification?
    };
    txn.onerror = event => {
      console.error('Error looking up script!', event);
      db.close();
    };
  } catch (e) {
    console.error('at installFromDownloader(), db fail:', e);
    db.close();
  }
}


async function installFromSource(source) {
  let db = await openDb();
  return new Promise((resolve, reject) => {
    try {
      let details = parseUserScript(source, null);
      let remoteScript = new RemoteUserScript(details);
      let txn = db.transaction([scriptStoreName], "readonly");
      let store = txn.objectStore(scriptStoreName);
      let index = store.index('id');
      let req = index.get(remoteScript.id);
      txn.oncomplete = event => {
        details = req.result || details;
        details.content = source;
        details.parsedDetails = details;
        let userScript = new EditableUserScript(details);
        saveUserScript(userScript);
        resolve(userScript.uuid);
        db.close();
      };
      txn.onerror = event => {
        console.error('Error looking up script!', event);
        db.close();
      };
    } catch (e) {
      console.error('at installFromSource(), db fail:', e);
      db.close();
    }
  });
}


async function loadUserScripts() {
  let db = await openDb();
  let txn = db.transaction([scriptStoreName], "readonly");
  let store = txn.objectStore(scriptStoreName);
  let req = store.getAll();
  req.onsuccess = event => {
    userScripts = {};
    event.target.result.forEach(details => {
      let userScript = new EditableUserScript(details);
      userScripts[details.uuid] = userScript;
      if (userScript.evalContentVersion != EVAL_CONTENT_VERSION) {
        userScript.calculateEvalContent();
        saveUserScript(userScript);
      }
    });
    db.close();
  };
  req.onerror = event => {
    console.warn('failed to load user scripts?', event);
    db.close();
  };
}


async function loadUserScripts() {
  let db = await openDb();
  let txn = db.transaction([scriptStoreName], "readonly");
  let store = txn.objectStore(scriptStoreName);
  let req = store.getAll();
  req.onsuccess = event => {
    userScripts = {};
    event.target.result.forEach(details => {
      let userScript = new EditableUserScript(details);
      userScripts[details.uuid] = userScript;
      if (userScript.evalContentVersion != EVAL_CONTENT_VERSION) {
        userScript.calculateEvalContent();
        saveUserScript(userScript);
      }
    });
    db.close();
  };
  req.onerror = event => {
    console.error('loadUserScripts() failure', event);
    db.close();
  };
}


function onEditorSaved(message, sender, sendResponse) {
  let userScript = userScripts[message.uuid];
  if (!userScript) {
    console.error('Got save for UUID', message.uuid, 'but it does not exist.');
    return;
  }

  // Use a clone of the current user script. This is so that any changes are
  // not propagated to the actual UserScript unless the transaction is
  // successful.
  let cloneScript = new EditableUserScript(userScript.details);
  cloneScript.updateFromEditorSaved(message)
      .then(value => saveUserScript(cloneScript));
};
window.onEditorSaved = onEditorSaved;


function onListUserScripts(message, sender, sendResponse) {
  let result = [];
  var userScriptIterator = UserScriptRegistry.scriptsToRunAt(
      null, message.includeDisabled);
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
      'UserScriptGet handler got non-installed UUID:', message.uuid);
  } else {
    sendResponse(userScripts[message.uuid].details);
  }
};
window.onUserScriptGet = onUserScriptGet;


function onApiGetResourceBlob(message, sender, sendResponse) {
  if (!message.uuid) {
    console.error('onApiGetResourceBlob handler got no UUID.');
    sendResponse(false);
    return;
  } else if (!message.resourceName) {
    console.error('onApiGetResourceBlob handler got no resourceName.');
    sendResponse(false);
    return;
  } else if (!userScripts[message.uuid]) {
    console.error(
        'onApiGetResourceBlob handler got non-installed UUID:', message.uuid);
    sendResponse(false);
    return;
  }
  checkApiCallAllowed('GM.getResourceUrl', message.uuid);

  let userScript = userScripts[message.uuid];
  let resource = userScript.resources[message.resourceName];
  if (!resource) {
    sendResponse(false);
  } else {
    sendResponse({
      'blob': resource.blob,
      'mimetype': resource.mimetype,
      'resourceName': message.resourceName,
    });
  }
};
window.onApiGetResourceBlob = onApiGetResourceBlob;


function onUserScriptToggleEnabled(message, sender, sendResponse) {
  const userScript = userScripts[message.uuid];
  console.log(
    '>>> onUserScriptToggleEnabled;', message.uuid, userScript);
  userScript.enabled = !userScript.enabled;
  saveUserScript(userScript);
  sendResponse({'enabled': userScript.enabled});
};
window.onUserScriptToggleEnabled = onUserScriptToggleEnabled;


async function onUserScriptUninstall(message, sender, sendResponse) {
  let db = await openDb();
  let txn = db.transaction([scriptStoreName], 'readwrite');
  let store = txn.objectStore(scriptStoreName);
  let req = store.delete(message.uuid);
  req.onsuccess = event => {
    // TODO: Drop value store DB.
    delete userScripts[message.uuid];
    sendResponse(null);
    db.close();
  };
  req.onerror = event => {
    console.error('onUserScriptUninstall() failure', event);
    db.close();
  };
};
window.onUserScriptUninstall = onUserScriptUninstall;


async function saveUserScript(userScript) {
  if (!(userScript instanceof EditableUserScript)) {
    throw new Error(
        'Cannot save this type of UserScript object:'
        + userScript.constructor.name);
  }

  function onSaveError(error) {
    let message;
    if (error.name == 'ConstraintError') {
      // Most likely due to namespace / name conflict.
      message = chrome.i18n.getMessage(
          'User script save failed: script named $1 already exists in namespace $2.',
          [JSON.stringify(userScript.name),
           JSON.stringify(userScript.namespace)]);
    } else {
      message = chrome.i18n.getMessage(
          'User script save failed: unknown error.');
    }

    // TODO: Pass this message to the editor tab, not general notifications.
    let notificationOpts = {
      'iconUrl': '/skin/icon.svg',
      'message': message,
      'title': 'Script Save Error',
      'type': 'basic',
    };
    chrome.notifications.create(notificationOpts);
  }

  let db = await openDb();
  return new Promise((resolve, reject) => {
    let txn = db.transaction([scriptStoreName], 'readwrite');
    txn.oncomplete = event => {
      // In case this was for an install, now that the user script is saved
      // to the object store, also put it in the in-memory copy.
      userScripts[userScript.uuid] = userScript;
      resolve();
      db.close();
    };
    txn.onerror = event => {
      onSaveError(event.target.error);
      reject(event.target.error);
      db.close();
    };

    try {
      let store = txn.objectStore(scriptStoreName);
      let details = userScript.details;
      details.id = userScript.id;  // Secondary index on calculated value.
      store.put(details, userScript.uuid);
    } catch (e) {
      onSaveError(e.target.error);
      reject(e);
      db.close();
    }
  });
}


function scriptByUuid(scriptUuid) {
  if (!userScripts[scriptUuid]) {
    throw new Error(
        'Could not find installed user script with uuid ' + scriptUuid);
  }
  return userScripts[scriptUuid];
}


// Generate user scripts to run at `urlStr`; all if no URL provided.
function* scriptsToRunAt(urlStr=null, includeDisabled=false) {
  let url = urlStr && new URL(urlStr);

  for (let uuid in userScripts) {
    let userScript = userScripts[uuid];
    try {
      if (!includeDisabled && !userScript.enabled) continue;
      if (url && !userScript.runsAt(url)) continue;
      yield userScript;
    } catch (e) {
      console.error(
          'Failed checking whether', userScript.toString(),
          'runs at', urlStr, ':', e);
    }
  }
}


// Export public API.
window.UserScriptRegistry = {
  '_loadUserScripts': loadUserScripts,
  '_saveUserScript': saveUserScript,
  'installFromDownloader': installFromDownloader,
  'installFromSource': installFromSource,
  'scriptByUuid': scriptByUuid,
  'scriptsToRunAt': scriptsToRunAt,
};

})();
