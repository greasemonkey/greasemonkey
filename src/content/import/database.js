
(function() {

async function dbImport(type, bufferPromise) {
  let databaseObject = await loadZipFile(await bufferPromise);
  let userScripts = await browser.runtime.sendMessage(
      {'name': 'ListUserScripts', 'includeDisabled': true});

  switch (type) {
    case 'merge':
      importAsMerge(userScripts, databaseObject);
      break;
    case 'replace':
      importAsReplace(userScripts, databaseObject);
      break;
    case 'overwrite':
      importAsOverwrite(userScripts, databaseObject);
      break;
  }
}


function importAsMerge(userScripts, databaseObject) {
  // Do not touch existing scritps and do not overwrite any matching ids.
  // If conflicts are found existing scripts take precedence.
  userScripts.forEach(details => {
    delete databaseObject[details.id];
  })
  let saves = Object.values(databaseObject).map(saveDatabaseObj);
  Promise.all(saves);
}


function importAsReplace(userScripts, databaseObject) {
  // Uninstall all existing scripts and replace them with the scritps
  // being imported.
  let uninstalls = userScripts.map(details => {
    return browser.runtime.sendMessage(
        {'name': 'UserScriptUninstall', 'uuid': details.uuid});
  });
  let saves = Object.values(databaseObject).map(saveDatabaseObj);
  Promise.all([].concat(uninstalls, saves));
}


function importAsOverwrite(userScripts, databaseObject) {
  // Similar to merge, but scripts being imported have precedence when
  // conflicting ids are found.
  let uninstalls = userScripts.forEach(details => {
    if (databaseObject[details.id]) {
      return browser.runtime.sendMessage(
          {'name': 'UserScriptUninstall', 'uuid': details.uuid});
    }
  });
  let saves = Object.values(databaseObject).map(saveDatabaseObj);
  Promise.all([].concat(uninstalls, saves));
}


async function loadZipFile(buffer) {
  let zip = await (new JSZip()).loadAsync(buffer, {checkCRC32: true});
  let scriptFiles = {};
  let databaseObject = {};

  // Map files as each script's content, details, or storage.
  Object.keys(zip.files).forEach(filename => {
    mapScriptFile(zip, filename, scriptFiles);
  });

  // Once we have all the files arrange the scripts by id
  let importScripts = Object.values(scriptFiles).map(importObj => {
    return prepareImportScript(importObj, databaseObject);
  });
  await Promise.all(importScripts);

  return databaseObject;
}


function mapScriptFile(zip, filename, scriptFiles) {
  let sliceIdx = filename.lastIndexOf('.', filename.lastIndexOf('.') - 1);
  let basename = filename.slice(0, sliceIdx);
  let fileType = filename.slice(sliceIdx + 1);

  if (!scriptFiles[basename]) {
    scriptFiles[basename] = {};
  }

  let key;
  // Only deal with files in which we know the type of
  switch (fileType) {
    case 'user.js':
      key = 'content';
    case 'gm_details.json':
      key = key || 'details';
    case 'storage.json':
      key = key || 'storage';
      scriptFiles[basename][key] =
          zip.file(filename).async('string').then(c => {
            if (key !== 'content') return JSON.parse(c);
            else return c;
          });
  }
}


async function prepareImportScript(importObj, databaseObject) {
  let [content, details, storage] = await
      Promise.all([importObj.content, importObj.details, importObj.storage])
  let id;

  // We do not have content. Cannot install
  // TODO: Show an error message of some sort?
  if (!content) return null;

  if (details) {
    id = details.id;
  } else {
    details = parseUserScript(content);
    id = details.name + '/' + details.namespace;
  }

  details.content = content;
  databaseObject[id] = {'details': details};
  if (storage) {
    databaseObject[id].values = storage.data;
  }
}


// Given a database object create and start a series of downloaders
function saveDatabaseObj(obj) {
  let details = obj.details;
  let values = obj.values;
  let downloader = new UserScriptDownloader();

  // TODO: Do blobs jsonify nicely?
  if (details.iconBlob) {
    downloader.setKnownIcon(details.iconUrl, details.iconBlob);
  }

  downloader.setKnownRequires(details.requiresContent);
  downloader.setKnownResources(details.resources);
  downloader.setKnownUuid(details.uuid);
  downloader.setScriptUrl(details.downloadUrl);
  downloader.setScriptContent(details.content);

  return downloader.start().then(() => downloader.install())
}


function readFile(fileObj, i18nKey) {
  if (!fileObj) {
    console.warn('No file provided for database import.');
    return;
  }

  let confirmed = confirm(_(i18nKey, fileObj.name));
  if (!confirmed) return;

  let fr = new FileReader();
  return new Promise((resolve, reject) => {
    fr.onload = () => {
      if (2 === fr.readyState) {
        resolve(fr.result);
      }
    };
    fr.readAsArrayBuffer(fileObj);
  });
}


document.getElementById('import-database-merge-file')
    .addEventListener('change', event => {
      let fileObj = event.target.files[0];
      dbImport('merge', readFile(fileObj, 'confirm_db_merge_FILENAME'));
    });
document.getElementById('import-database-replace-file')
    .addEventListener('change', event => {
      let fileObj = event.target.files[0];
      dbImport('replace', readFile(fileObj, 'confirm_db_replace_FILENAME'));
    });
document.getElementById('import-database-overwrite-file')
    .addEventListener('change', event => {
      let fileObj = event.target.files[0];
      dbImport('overwrite', readFile(fileObj, 'confirm_db_overwrite_FILENAME'));
    });
rivets.bind(document.body, {});
})();
