'use strict';

let gImportOptions = {
  'modeDialog': true,
  'modeDone': false,
  'modeImport': false,
  'progressCurrent': 0,
  'progressMax': 1,
  'remove': false,
  'replace': true,
};


async function onFileChange(event) {
  let fileObj = event.target.files[0];

  let zipPromise = JSZip.loadAsync(fileObj, {
    'checkCRC32': true,
    'createFolders': true,
  });
  let userScriptsPromise = browser.runtime.sendMessage(
      {'name': 'ListUserScripts', 'includeDisabled': true});
  await Promise.all([zipPromise, userScriptsPromise])
      .then(async promisedValues => {
        let [zip, userScripts] = promisedValues;
        let installedIdToUuid = userScripts.reduce((set, val) => {
          let userScript = new RunnableUserScript(val);
          set[userScript.id] = userScript.uuid;
          return set;
        }, {});
        await importAllScriptsFromZip(zip, installedIdToUuid);
      });
}


async function importAllScriptsFromZip(zip, installedIdToUuid) {
  // The namespace-and-name ID of all user scripts in the zip.
  let importedIds = new Set();

  let userScriptFiles = zip.file(/\.user\.js$/);
  gImportOptions.progressMax = userScriptFiles.length;
  gImportOptions.modeDialog = false;
  gImportOptions.modeImport = true;

  for (let i = 0, file = null; file = userScriptFiles[i]; i++) {
    await importOneScriptFromZip(zip, file, installedIdToUuid, importedIds);
    gImportOptions.progressCurrent = gImportOptions.progressCurrent + 1;
    // Rivets can't bind to attribute value of <progress> (??).
    document.querySelector('progress') && document.querySelector('progress')
        .setAttribute('value', gImportOptions.progressCurrent.toString());
  }

  if (gImportOptions.remove) {
    let installedNotImportedIds = [...Object.keys(installedIdToUuid)]
        .filter(x => !importedIds.has(x));
    for (let installedId of installedNotImportedIds) {
      chrome.runtime.sendMessage({
        'name': 'UserScriptUninstall',
        'uuid': installedIdToUuid[installedId],
      }, logUnhandledError);
    }
  }

  gImportOptions.modeImport = false;
  gImportOptions.modeDone = true;
}


async function importOneScriptFromZip(zip, file, installedIds, importedIds) {
  let exportDetails = {'enabled': true};
  let content = await file.async('text');

  let downloader = new UserScriptDownloader();
  downloader.setScriptContent(content);

  if (!file.name.includes('/')) {
    downloader.setScriptUrl('file:///' + file.name);
  } else {
    let folderName = file.name.substr(0, file.name.lastIndexOf('/'));

    exportDetails = await zip.file(`${folderName}/.gm.json`)
        .async('text')
        .then(JSON.parse);

    let urlMap = {};
    if (zip.file(`${folderName}/.files.json`)) {
      urlMap = await zip.file(`${folderName}/.files.json`)
          .async('text')
          .then(JSON.parse);
    }

    await fillDownloaderFromZipFolder(
        downloader, zip, content, exportDetails, urlMap, folderName);
  }

  await downloader.start();
  let userScript = new RemoteUserScript(await downloader.scriptDetails);

  if (gImportOptions.replace || !installedIds.has(userScript.id)) {
    importedIds.add(userScript.id);
    await downloader.install('install', /*disabled=*/!exportDetails.enabled);
  }
}


async function fillDownloaderFromZipFolder(
    downloader, zip, scriptContent, exportDetails, urlMap, folderName) {
  downloader.setScriptUrl(exportDetails.downloadUrl);

  let parsedDetails = parseUserScript(scriptContent, exportDetails.downloadUrl);

  if (exportDetails.iconFilename) {
    let iconBlob = zip.file(exportDetails.iconFilename).async('blob');
    downloader.setKnownIcon(parsedDetails.iconUrl, iconBlob);
  }

  let requires = {};
  parsedDetails.requireUrls.forEach(u => {
    try {
      requires[u] = zip.file(urlMap[u]).async('text');
    } catch (e) {
      console.warn('Could not load from backup zip, will attempt download:', u);
    }
  });
  downloader.setKnownRequires(requires);

  let resources = {};
  Object.values(parsedDetails.resourceUrls).forEach(u => {
    try {
      resources[u] = zip.file(urlMap[u]).async('blob');
    } catch (e) {
      console.warn('Could not load from backup zip, will attempt download:', u);
    }
  });
  downloader.setKnownResources(resources);

  let storedFilename = folderName + '/' + '.stored.json';
  let storedFile = zip.file(storedFilename);
  if (storedFile) {
    let stored = JSON.parse(await storedFile.async('text'));
    downloader.setScriptValues(stored);
  }

  return downloader;
}
