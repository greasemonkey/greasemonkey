'use strict';
/* Functions for exporting GM database. */

// Private implementation.
(function() {

async function onExportDatabase() {
  let userScriptIterator = UserScriptRegistry.scriptsToRunAt(null, true);
  let zip = await _createExportZip(userScriptIterator);
  let zipUrl = URL.createObjectURL(await zip.generateAsync({'type': 'blob'}));
  return chrome.downloads.download({
    'filename': exportFilename(),
    'saveAs': true,
    'url': zipUrl,
  }, logUnhandledError);
}
window.onExportDatabase = onExportDatabase;


async function _createExportZip(userScriptIterator) {
  let result = new JSZip();

  let takenFolderNames = new Set();
  let pending = [];
  let count = 0;
  for (let userScript of userScriptIterator) {
    let exportFolderName
        = minimallyMangleFilename(takenFolderNames, userScript.name);
    let exportFolder = result.folder(exportFolderName);
    pending.push(
        addUserScriptToExport(exportFolder, exportFolderName, userScript));
    count++;
  }
  await Promise.all(pending);

  return result;
}
// Visible for testing only!!
window._createExportZip = _createExportZip;


async function addUserScriptToExport(
    exportFolder, exportFolderName, userScript) {
  let takenFileNames = new Set();
  let urlMap = {};

  let urlMapFilename = '.files.json';
  takenFileNames.add(urlMapFilename);

  // TODO: Escape special characters in all file names.

  let userScriptFilename;
  try {
    userScriptFilename = fileNameFromUrl(userScript.downloadUrl);
  } catch (e) {
    userScriptFilename = userScript.name + '.user.js';
  }
  takenFileNames.add(userScriptFilename);
  exportFolder.file(
      userScriptFilename, userScript.content, {'compression': 'DEFLATE'});

  // TODO: Icon.

  let gmDetails = {
    'downloadUrl': userScript.details.downloadUrl,
    'enabled': userScript.details.enabled,
    'userExcludes': userScript.details.userExcludes,
    'userIncludes': userScript.details.userIncludes,
    'userMatches': userScript.details.userMatches,
  };
  let gmDetailsFilename = '.gm.json';
  takenFileNames.add(gmDetailsFilename);
  exportFolder.file(
      gmDetailsFilename, JSON.stringify(gmDetails),
      {'compression': 'DEFLATE'});

  let storageEntries = await userScriptStore(userScript.uuid);
  if (Object.keys(storageEntries).length > 0) {
    let storageFilename = '.stored.json';
    takenFileNames.add(storageFilename);
    exportFolder.file(
        storageFilename, JSON.stringify(storageEntries),
        {'compression': 'DEFLATE'});
  }

  Object.entries(userScript.requiresContent).forEach(e => {
    let [url, requireContent] = e;
    let requireFilename = fileNameFromUrl(url);
    let mangledFilename = minimallyMangleFilename(takenFileNames, requireFilename);
    let options = {'compression': 'DEFLATE'};
    if (mangledFilename != requireFilename) {
      options['comment'] = 'Original file name: ' + requireFilename;
    }
    exportFolder.file(mangledFilename, requireContent, options);
    urlMap[url] = exportFolderName + '/' + mangledFilename;
  });

  let parsedMeta = parseUserScript(userScript.content, userScript.downloadUrl);
  Object.entries(userScript.resources).forEach(e => {
    let [name, resource] = e;
    let url = parsedMeta.resourceUrls[name];
    let resourceFilename = fileNameFromUrl(url);
    let mangledFilename = minimallyMangleFilename(takenFileNames, resourceFilename);
    exportFolder.file(
        mangledFilename, resource.blob,
        mangledFilename != resourceFilename
            ? {'comment': 'Original resource name: ' + resourceFilename}
            : {});
    urlMap[url] = exportFolderName + '/' + mangledFilename;
  });

  if (Object.keys(urlMap).length > 0) {
    exportFolder.file(
        urlMapFilename, JSON.stringify(urlMap),
        {'compression': 'DEFLATE'});
  }
}


function exportFilename() {
  let date = new Date();
  return 'Greasemonkey_backup_'
      + date.getFullYear().toString()
      + (date.getMonth() + 1).toString().padStart(2, '0')
      + date.getDate().toString().padStart(2, '0')
      + '_'
      + date.getHours().toString().padStart(2, '0')
      + date.getMinutes().toString().padStart(2, '0')
      + date.getSeconds().toString().padStart(2, '0')
      + '.zip';
}


function fileNameFromUrl(url) {
  let path;
  try {
    path = new URL(url).pathname;
  } catch (e) {
    path = url;
  }
  return path.substring(path.lastIndexOf('/') + 1);
}


function minimallyMangleFilename(takenNames, wantedName) {
  let escapeFilename = s => s.replace(/[:/]/g, '--');
  let mangledName = escapeFilename(wantedName);

  if (takenNames.has(wantedName)) {
    let i = wantedName.lastIndexOf('.');
    if (i < 0) i = wantedName.length;
    let n = 2;
    do {
      if (n > 99) {
        throw new Error('Could not mangle name ' + wantedName);
      }
      mangledName = wantedName.substr(0, i) + '.' + n + wantedName.substr(i);
      mangledName = escapeFilename(mangledName);
      n++;
    } while (takenNames.has(mangledName));
  }

  takenNames.add(mangledName);
  return mangledName;
}


async function userScriptStore(uuid) {
  let keys = await ValueStore.listValues(uuid);
  let values = await Promise.all(keys.map(k => ValueStore.getValue(uuid, k)));
  let entries = {};
  for (let i = keys.length; i--;) {
    entries[keys[i]] = values[i];
  }
  return entries;
}

})();
