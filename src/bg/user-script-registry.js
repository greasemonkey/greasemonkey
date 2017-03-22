/*
The registry of installed user scripts.

The `UserScriptRegistry` object owns a set of UserScript objects (?), and
exports methods for discovering them.
*/

// Private implementation.
(function() {

let userScripts = {};


const dbName = 'webbymonkey';
const dbVersion = 3;
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
      console.log('>>> db success!', dbOpen.result);
      resolve(event.target.result);
    };
    dbOpen.onupgradeneeded = event => {
      console.log('>>> db upgradeneeded');
      let db = event.target.result;
      db.onerror = event => {
        console.error('Error upgrading user-scripts DB!', event);
        reject(event);
      };
      let store = db.createObjectStore(scriptStoreName, {'keypath': 'uuid'});
      // The per-install completely random UUID of each script.
      store.createIndex('uuid', 'uuid', {'unique': true});
      // The generated from @name and @namespace ID.
      store.createIndex('id', 'id', {'unique': true});
    };
  });
})();


function _save(userScript) {
  if (!(userScript instanceof EditableUserScript)) {
    throw new Error('Cannot save this type of UserScript object!', userScript);
  }
  console.log('>>> _save()', userScript, db);
  db.then((db) => {
    console.log('listen...');
    let txn = db.transaction([scriptStoreName], "readwrite");
    txn.oncomplete = event => {
      console.log('transaction complete?', event);
    };
    txn.onerror = event => {
      console.log('transaction error?', event);
    };

    try {
      let store = txn.objectStore(scriptStoreName);
      store.onsuccess = event => {
        console.log('store success?', event);
      };
      console.log('transaction', txn);
      console.log('store', store);
      console.log('add...');
      store.add(userScript.details, userScript.uuid);
    } catch (e) {
      // If these fail, they fail invisibly unless we catch and log (!?).
      console.error(e);
      return;
    }
  });
}


window.UserScriptRegistry = {
  install(downloader) {
    console.log('>>> UserScriptRegistry.install() ...');

    // TODO: If is installed already then get, else create:
    var userScriptDetails = parseUserScript(
        downloader.scriptDownload.xhr.responseText,
        downloader.scriptDownload.xhr.responseURL);
    console.log('install, downloaded details:', userScriptDetails);
    var userScript = new EditableUserScript(userScriptDetails);

    userScript.updateFromDownloader(downloader);
    _save(userScript);

    // TODO: Notification?
  }
};

})();
