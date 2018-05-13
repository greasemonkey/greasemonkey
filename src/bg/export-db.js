'use strict';
/* Functions for exporting GM database. */

// Private implementation.
(function() {

function blobToBase64(blob) {
  if (!blob) return Promise.resolve(null);

  let reader = new FileReader();
  reader.readAsDataURL(blob);
  return new Promise((resolve, reject) => {
    reader.onload = event => {
      let result = reader.result.slice(reader.result.indexOf(',') + 1);
      resolve({'data': result, 'type': blob.type});
    };
  });
}


function onExportDatabase() {
  let scriptsData = [];

  for (let userScript of UserScriptRegistry.scriptsToRunAt(null, true)) {
    scriptsData.push(userScriptData(userScript));
  }

  return Promise.all(scriptsData).then(
      databaseObject => exportZipBlob(databaseObject)
  ).then(zipBlob => {
    return chrome.downloads.download({
      'filename': exportFilename(),
      'saveAs': true,
      'url': URL.createObjectURL(zipBlob)
    });
  });
}
window.onExportDatabase = onExportDatabase;


// Since `data#toLocaleFormat()` is deprecated, and therefore C style
// datestring formating, creating a safe datestring in the local timezone is
// overly verbose; result: Greasemonkey_backup_YYYYMMDD_hhmmss.zip
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


function exportZipBlob(databaseObject) {
  let ts = Date.now();
  let zip = new JSZip();

  databaseObject.forEach((obj, count) => {
    // TODO: Sanitize filenames for filesystems.
    // Like the restriction on ':' (Windows).
    let fileBase = obj.details.name;

    // Since scripts can have the same name (different namespace) they all need
    // to be uniquely identified within the zip archive. A simple counter is
    // used for each script.
    fileBase = count.toString().padStart(3, '0') + '_' + fileBase;

    zip.file(fileBase + '.user.js', obj.details.content);
    delete obj.details.content;
    zip.file(fileBase + '.gm_details.json', JSON.stringify(obj.details));
    if (obj.values) {
      zip.file(
          fileBase + '.storage.json',
          JSON.stringify({'ts': ts, 'data': obj.values}));
    }
  });

  return zip.generateAsync({'type': 'blob'});
}


// Create a promise to resolve details for the passed user script.
async function userScriptData(userScript) {
  let details = userScript.details;
  let grants = details.grants;
  // Remove parsedDetails as it creates cycles and cannot be properly saved.
  delete details.parsedDetails;

  if (details.iconBlob) {
    details.iconBlob = await blobToBase64(details.iconBlob);
  }

  if (details.resources) {
    let resourceValues = Object.values(details.resources);
    details.resources = {};
    await Promise.all(resourceValues.map(async (resource) => {
      details.resources[resource.name] = {
        'name': resource.name,
        'mimetype': resource.mimetype,
        'blob': await blobToBase64(resource.blob)
      };
    }));
  }

  if (grants.includes('GM.deleteValue') ||
      grants.includes('GM.getValue') ||
      grants.includes('GM.listValues') ||
      grants.includes('GM.setValue')) {
    return {'details': details, 'values': await userScriptStore(details.uuid)};
  } else {
    return {'details': details};
  }
}


// Retrieve value store data for the uuid
async function userScriptStore(uuid) {
  let storeKeys = await ValueStore.listValues(uuid);
  let storeValues =
      await Promise.all(storeKeys.map(k => ValueStore.getValue(uuid, k)));
  let keyPairs = {};

  for (let idx = storeKeys.length; idx--;) {
    keyPairs[storeKeys[idx]] = storeValues[idx];
  }
  return keyPairs;
}

})();
