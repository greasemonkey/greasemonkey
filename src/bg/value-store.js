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


function onApiGetValue(message, sender, sendResponse) {
  if (!message.uuid) {
    console.warn('ApiGetValue handler got no UUID.');
    return;
  } else if (!message.key) {
    console.warn('ApiGetValue handler got no key.');
    return;
  }

  scriptStoreDb(message.uuid).then((db) => {
    let txn = db.transaction([valueStoreName], 'readonly');
    let store = txn.objectStore(valueStoreName);
    let req = store.get(message.key);
    req.onsuccess = event => {
      if (!event.target.result) {
        sendResponse(undefined);
      } else {
        sendResponse(event.target.result.value);
      }
    };
    req.onerror = event => {
      console.warn(
          'failed to retrieve', message.key, 'for', message.uuid, ':', event);
      sendResponse(undefined);
    };
  });

  // Return true causes sendResponse to work after async. step above completes.
  return true;
};
window.onApiGetValue = onApiGetValue;


function onApiListValues(message, sender, sendResponse) {
  if (!message.uuid) {
    console.warn('ApiListValues handler got no UUID.');
    return;
  }

  scriptStoreDb(message.uuid).then((db) => {
    let txn = db.transaction([valueStoreName], 'readonly');
    let store = txn.objectStore(valueStoreName);
    let req = store.getAllKeys();
    req.onsuccess = event => {
      sendResponse(event.target.result);
    };
    req.onerror = event => {
      console.warn(
          'failed to list stored keys for', message.uuid, ':', event);
      sendResponse(undefined);
    };
  });

  // Return true causes sendResponse to work after async. step above completes.
  return true;
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

  scriptStoreDb(message.uuid).then((db) => {
    let txn = db.transaction([valueStoreName], 'readwrite');
    let store = txn.objectStore(valueStoreName);
    let req = store.put({'value': message.value}, message.key);
    req.onsuccess = event => {
      sendResponse(true);
    };
    req.onerror = event => {
      console.warn(
          'failed to set', message.key, 'for', message.uuid, ':', event);
      sendResponse(false);
    };
  });

  // Return true causes sendResponse to work after async. step above completes.
  return true;
};
window.onApiSetValue = onApiSetValue;

})();
