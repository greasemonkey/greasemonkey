'use strict';
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


function blobToBuffer(blob) {
  if (!blob) return Promise.resolve(null);

  let reader = new FileReader();
  reader.readAsArrayBuffer(blob);
  return new Promise(resolve => {
    reader.onload = () => resolve({'buffer': reader.result, 'type': blob.type});
  });
}


function bufferToBlob(buffer) {
  if (!buffer) return buffer;
  if (buffer instanceof Blob) return buffer;
  return new Blob([buffer.buffer], {'type': buffer.type});
}


function detailsBuffersToBlobs(details) {
  // See #2909; ArrayBuffers in IndexedDB; convert to Blobs in memory.
  details.iconBlob = bufferToBlob(details.iconBlob);
  Object.keys(details.resources || {}).forEach(k => {
    let r = details.resources[k];
    r.blob = bufferToBlob(r.blob);
  });
}


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
    dbOpen.onsuccess = event => resolve(event.target.result);
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

async function installFromDownloader(userScriptDetails, downloaderDetails) {
  let remoteScript = new RemoteUserScript(userScriptDetails);
  let scriptValues = downloaderDetails.valueStore;
  delete downloaderDetails.valueStore;

  let db = await openDb();
  let txn = db.transaction([scriptStoreName], "readonly");
  let store = txn.objectStore(scriptStoreName);
  let index = store.index('id');
  let req = index.get(remoteScript.id);
  db.close();

  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).then(foundDetails => {
    foundDetails = foundDetails || {};
    detailsBuffersToBlobs(foundDetails);
    let userScript = new EditableUserScript(foundDetails);
    userScript
        .updateFromDownloaderDetails(userScriptDetails, downloaderDetails);
    return userScript;
  }).then(saveUserScript)
  .then(async (details) => {
    if (scriptValues) {
      await ValueStore.deleteStore(details.uuid);
      let setValues = Object.entries(scriptValues).map(([key, value]) => {
        return ValueStore.setValue(details.uuid, key, value);
      });
      await Promise.all(setValues);
    }
    return details;
  }).catch(err => {
    console.error('Error in installFromDownloader()', err);
    // Rethrow so caller can also deal with it
    throw err;
  });
}


async function loadUserScripts() {
  let db = await openDb();
  let txn = db.transaction([scriptStoreName], "readonly");
  let store = txn.objectStore(scriptStoreName);
  let req = store.getAll();
  db.close();

  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).then(loadDetails => {
    let savePromises = loadDetails.map(details => {
      detailsBuffersToBlobs(details);
      if (details.evalContentVersion != EVAL_CONTENT_VERSION) {
        return saveUserScript(new EditableUserScript(details));
      } else {
        return details;
      }
    });
    return Promise.all(savePromises);
  }).then(saveDetails => {
    userScripts = {};
    saveDetails.forEach(details => {
      userScripts[details.uuid] = new EditableUserScript(details);
    });
  }).catch(err => {
    console.error('Failed to load user scripts', err);
  });
}


function onListUserScripts(message, sender, sendResponse) {
  let result = [];
  let userScriptIterator = UserScriptRegistry.scriptsToRunAt(
      null, message.includeDisabled);
  for (let userScript of userScriptIterator) {
    let details = userScript.details;
    if (('undefined' == typeof message.stripContent) || message.stripContent) {
      delete details.evalContent;
      delete details.requiresContent;
      delete details.resources;
    }
    result.push(details);
  }
  sendResponse(result);
}
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
}
window.onUserScriptGet = onUserScriptGet;


function onUserScriptInstall(message, sender, sendResponse) {
  return installFromDownloader(message.userScript, message.downloader);
}
window.onUserScriptInstall = onUserScriptInstall;


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
}
window.onApiGetResourceBlob = onApiGetResourceBlob;


window.onUserScriptOptionsSave = async function(message, sender, sendResponse) {
  let details = message.details;
  if (!details.uuid) {
    console.warn(
        'For UserScriptOptionsSave, details specified no UUID:', details);
    return;
  }
  const userScript = userScripts[details.uuid];
  if (!userScript) {
    console.warn(
        'For UserScriptOptionsSave, could not find script with UUID',
        details.uuid);
    return;
  }

  for (let k of ['userIncludes', 'userExcludes', 'userMatches']) {
    userScript[k] = details[k].trim().split('\n')
        .map(x => x.trim()).filter(x => x.length > 0);
    userScript[k + 'Exclusive'] = details[k + 'Exclusive'];
  }

  return saveUserScript(userScript);
};


function onUserScriptToggleAutoUpdate(message, sender, sendResponse) {
  const userScript = userScripts[message.uuid];
  userScript.autoUpdate = !userScript.autoUpdate;
  return saveUserScript(userScript).then(() => {
    return {'autoUpdate': userScript.autoUpdate}
  });
}
window.onUserScriptToggleAutoUpdate = onUserScriptToggleAutoUpdate;


function onUserScriptToggleEnabled(message, sender, sendResponse) {
  const userScript = userScripts[message.uuid];
  userScript.enabled = !userScript.enabled;
  return saveUserScript(userScript).then(() => {
    return {'enabled': userScript.enabled}
  });
}
window.onUserScriptToggleEnabled = onUserScriptToggleEnabled;


async function onUserScriptUninstall(message, sender, sendResponse) {
  let db = await openDb();
  let txn = db.transaction([scriptStoreName], 'readwrite');
  let store = txn.objectStore(scriptStoreName);
  let req = store.delete(message.uuid);
  db.close();

  // TODO: Delete per-script values from local storage!

  return new Promise((resolve, reject) => {
    req.onsuccess = () => {
      delete userScripts[message.uuid];
      resolve();
    };
    req.onerror = event => {
      console.error('onUserScriptUninstall() failure', event);
      reject(req.error);
    };
  }).then(() => {
    // TODO: The store may be orphaned if this fails
    return ValueStore.deleteStore(message.uuid);
  });
}
window.onUserScriptUninstall = onUserScriptUninstall;


async function saveUserScript(userScript) {
  if (!(userScript instanceof EditableUserScript)) {
    throw new Error(
        'Cannot save this type of UserScript object: '
        + userScript.constructor.name);
  }

  userScript.calculateEvalContent();

  function onSaveError(error) {
    let message;
    if (error.name == 'ConstraintError') {
      // Most likely due to namespace / name conflict.
      message = _(
          'save_failed_NAME_already_in_NAMESPACE',
          JSON.stringify(userScript.name),
          JSON.stringify(userScript.namespace));
    } else {
      message = _('save_failed_unknown');
    }
    // Rethrow to allow caller to deal with error
    let retError = new Error(message);
    retError.orig = error;
    throw retError;
  }

  let details = userScript.details;
  details.id = userScript.id;  // Secondary index on calculated value.

  // See #2909; write ArrayBuffers to IndexedDB; not Blobs.
  details.iconBlob = await blobToBuffer(details.iconBlob);
  await Promise.all(Object.entries(details.resources).map(async ([k, v]) => {
    // Don't modify the script's resources in place; _safeCopy() is shallow!
    let result = Object.assign({}, v);
    result.blob = await blobToBuffer(result.blob);
    return [k, result];
  })).then(entries => {
    details.resources = entries.reduce((obj, [k, v]) => ({...obj, [k]: v}), {});
  });

  let db = await openDb();
  let txn = db.transaction([scriptStoreName], 'readwrite');
  let store = txn.objectStore(scriptStoreName);
  let req = store.put(details, userScript.uuid);
  db.close();

  return new Promise((resolve, reject) => {
    req.onsuccess = () => {
      // In case this was for an install, now that the user script is saved
      // to the object store, also put it in the in-memory copy.
      userScripts[userScript.uuid] = userScript;
      // Create a new details object since the original was modified for saving
      let resDetails = userScript.details;
      resDetails.id = userScript.id;
      resolve(resDetails);
    };
    req.onerror = () => reject(req.error);
  }).catch(onSaveError);
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

  for (let uuid of Object.keys(userScripts)) {
    let userScript = userScripts[uuid];
    try {
      if (!includeDisabled && !userScript.enabled) continue;
      if (url && !userScript.runsOn(url)) continue;
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
  'scriptByUuid': scriptByUuid,
  'scriptsToRunAt': scriptsToRunAt,
};

})();
