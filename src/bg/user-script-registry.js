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
const dbVersion = 4;
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


function loadUserScripts() {
  db.then(db => {
    let txn = db.transaction([scriptStoreName], "readonly");
    let store = txn.objectStore(scriptStoreName);
    let req = store.getAll();
    req.onsuccess = event => {
      userScripts = {};
      event.target.result.forEach(details => {
        userScripts[details.uuid] = new RunnableUserScript(details);
      });
    };
    req.onerror = event => {
      console.error('loadUserScripts() failure', e);
    };
  });
};


function saveUserScript(userScript) {
  if (!(userScript instanceof EditableUserScript)) {
    throw new Error('Cannot save this type of UserScript object:' + userScript.constructor.name);
  }
  db.then((db) => {
    let txn = db.transaction([scriptStoreName], 'readwrite');
    txn.oncomplete = event => {
      console.log('transaction complete?', event);
      userScripts[userScript.uuid] = userScript;
      console.info('Stored new userScript in memory.', userScripts);
    };
    txn.onerror = event => {
      console.warn('transaction error?', event, event.target);
    };

    try {
      let store = txn.objectStore(scriptStoreName);
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
    // TODO: If is installed already then get, else create:
    var userScriptDetails = parseUserScript(
        downloader.scriptDownload.xhr.responseText,
        downloader.scriptDownload.xhr.responseURL);
    var userScript = new EditableUserScript(userScriptDetails);

    userScript.updateFromDownloader(downloader);
    saveUserScript(userScript);

    // TODO: Notification?
  },

  // Generate user scripts, to run at `urlStr`; all if no URL provided.
  scriptsToRunAt: function*(urlStr=null) {
    let url = urlStr && new URL(urlStr);
    for (let uuid in userScripts) {
      let userScript = userScripts[uuid];
      if (!userScript.enabled) return;
      if (url && !userScript.runsAt(url)) return;
      yield userScript;
    }
  }
};


window.onListUserScripts = function(message, sender, sendResponse) {
  let result = [];
  var userScriptIterator = UserScriptRegistry.scriptsToRunAt();
  for (let userScript of userScriptIterator) {
    result.push(userScript.details);
  }
  sendResponse(result);
};

loadUserScripts();

})();
