'use strict';
/*
The backing implementation for getValue/setValue (and listValues
and deleteValue).  In the background process, receives messages sent from
content.  Refers to persistence in IndexedDB and returns the appropriate
result to the sender.
*/

// Private implementation.
(function() {

const valueStoreName = 'values';


function scriptStoreDb(uuid) {
  function openDb() {
    const dbVersion = 1;
    return new Promise((resolve, reject) => {
      let dbOpen = indexedDB.open('user-script-' + uuid, dbVersion);
      dbOpen.onerror = event => {
        console.error('Error opening script store DB!', uuid, event);
        reject(event);
      };
      dbOpen.onsuccess = event => {
        resolve(event.target.result);
      };
      dbOpen.onupgradeneeded = event => {
        let db = event.target.result;
        db.onerror = event => {
          console.error('Error upgrading script store DB!', uuid, event);
          reject(event);
        };
        let store = db.createObjectStore(valueStoreName, {'keypath': 'key'});
      };
    });
  }

  // Android does not support persist. Conditionally set it.
  if (navigator.storage && navigator.storage.persist) {
    return navigator.storage.persist().then(openDb);
  } else {
    return openDb();
  }
}

//////////////////////////// Store Implementation \\\\\\\\\\\\\\\\\\\\\\\\\\\\\

function deleteStore(uuid) {
  return new Promise((resolve, reject) => {
    let deleteReq = indexedDB.deleteDatabase('user-script-' + uuid);
    deleteReq.onsuccess = event => {
      resolve(null);
    };
    deleteReq.onerror = event => {
      reject(event);
    };
  });
}


async function deleteValue(uuid, key) {
  let scriptDb = await scriptStoreDb(uuid);
  let txn = scriptDb.transaction([valueStoreName], 'readwrite');
  let store = txn.objectStore(valueStoreName);
  let req = store.delete(key);
  scriptDb.close();

  return new Promise((resolve, reject) => {
    req.onsuccess = event => {
      resolve(true);
    };
    req.onerror = event => {
      console.warn('failed to delete', key, 'for', uuid, ':', event);
      // Don't reject to maintain compatibility with code that expects a
      // false return value.
      resolve(false);
    };
  });
}


async function getValue(uuid, key) {
  let scriptDb = await scriptStoreDb(uuid);
  let txn = scriptDb.transaction([valueStoreName], 'readonly');
  let store = txn.objectStore(valueStoreName);
  let req = store.get(key);
  scriptDb.close();

  return new Promise((resolve, reject) => {
    req.onsuccess = event => {
      if (!event.target.result) {
        resolve(undefined);
      } else {
        resolve(req.result.value);
      }
    };
    req.onerror = event => {
      console.warn('failed to retrieve', key, 'for', uuid, ':', event);
      // Don't reject to maintain compatibility with code that expects a
      // undefined return value.
      resolve(undefined);
    };
  });
}


async function listValues(uuid) {
  let scriptDb = await scriptStoreDb(uuid);
  let txn = scriptDb.transaction([valueStoreName], 'readonly');
  let store = txn.objectStore(valueStoreName);
  let req = store.getAllKeys();
  scriptDb.close();

  return new Promise((resolve, reject) => {
    req.onsuccess = event => {
      resolve(req.result);
    };
    req.onerror = event => {
      console.warn('failed to list stored keys for', uuid, ':', event);
      // Don't reject to maintain compatibility with code that expects a
      // undefined return value.
      resolve(undefined);
    };
  });
}


async function setValue(uuid, key, value) {
  let scriptDb = await scriptStoreDb(uuid);
  let txn = scriptDb.transaction([valueStoreName], 'readwrite');
  let store = txn.objectStore(valueStoreName);
  let req = store.put({'value': value}, key);
  scriptDb.close();

  return new Promise((resolve, reject) => {
    req.onsuccess = event => {
      resolve(true);
    };
    req.onerror = event => {
      console.warn('failed to set', key, 'for', uuid, ':', event);
      // Don't reject to maintain compatibility with code that expects a
      // false return value.
      resolve(false);
    };
  });
}


window.ValueStore = {
  'deleteStore': deleteStore,
  'deleteValue': deleteValue,
  'getValue': getValue,
  'listValues': listValues,
  'setValue': setValue,
};

////////////////////////////// Message Listeners \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

function onApiDeleteValue(message, sender, sendResponse) {
  if (!message.uuid) {
    console.warn('ApiDeleteValue handler got no UUID.');
    return;
  } else if (!message.key) {
    console.warn('ApiDeleteValue handler got no key.');
    return;
  }
  checkApiCallAllowed('GM.deleteValue', message.uuid);

  // Return a promise
  return deleteValue(message.uuid, message.key);
};
window.onApiDeleteValue = onApiDeleteValue;


function onApiGetValue(message, sender, sendResponse) {
  if (!message.uuid) {
    console.warn('ApiGetValue handler got no UUID.');
    return;
  } else if (!message.key) {
    console.warn('ApiGetValue handler got no key.');
    return;
  }
  checkApiCallAllowed('GM.getValue', message.uuid);

  // Return a promise
  return getValue(message.uuid, message.key);
};
window.onApiGetValue = onApiGetValue;


function onApiListValues(message, sender, sendResponse) {
  if (!message.uuid) {
    console.warn('ApiListValues handler got no UUID.');
    return;
  }
  checkApiCallAllowed('GM.listValues', message.uuid);

  // Return a promise
  return listValues(message.uuid);
};
window.onApiListValues = onApiListValues;


function onApiSetValue(message, sender, sendResponse) {
  if (!message.uuid) {
    console.warn('ApiSetValue handler got no UUID.');
    return;
  } else if (!message.key) {
    console.warn('ApiSetValue handler got no key.');
    return;
  }
  checkApiCallAllowed('GM.setValue', message.uuid);

  // Return a promise
  return setValue(message.uuid, message.key, message.value);
};
window.onApiSetValue = onApiSetValue;

})();
