/*
Syncs a local directory with user script contents via WebDAV server.
(Doesn't sync requiresContents and script values.)

The `SyncViaWebdav` object exports methods for syncing to a local directory.
*/

// Private implementation.
(function() {

// A milliseconds.
const DIRECTORY_MONITOR_INTERVAL = 1000;

/**
 * @typedef {object} WebDAV
 * @property {import('../../third-party/webdav/index').createClient} createClient
 */

/** @type {import('../../third-party/webdav/index').WebDAVClient} */
let webdavClient = null;
let timerId = 0;

/** @type {Object.<string>} */
const userScriptUuidErrorNotificationIdPairs = {};

///////////////////////////////////////////////////////////////////////////////

// Utilities.

const _queue = [];
let _next, _lock, _releaseLock, _rejectLock;

async function _getLock() {
  const symbol = Symbol();
  if (_next) {
    _queue.push(symbol);
  } else {
    _next = symbol;
  }

  do {
    await _lock;
  } while (_next !== symbol);

  _lock = new Promise((resolve, reject) => {
    _releaseLock = resolve;
    _rejectLock = exception => {
      _next = null;
      _lock = null;
      _queue.splice(0, _queue.length);
      reject(exception);
    };
  });

  _next = _queue.shift();
}

const MAX_FILENAME_LENGTH = 255;

function _prepareToConvertValidFileName(str) {
  return str.replace(/[\x00-\x1F]|^\s+/ug, '').replace(/["#*/:<>?\\|]+|^\./ugi, _convertAsciiCodePointsToFull).replace(
      /^(?:AUX|CLOCK\$|COM[1-9]|CON|LPT[1-9]|NUL|PRN)\s*\./ui,
      match => match.replace('.', _convertAsciiCodePointsToFull));
}

const _HALF_TO_FULL_DIFF = '？'.codePointAt() - '?'.codePointAt();

function _convertAsciiCodePointsToFull(codePoints) {
  return Array.from(codePoints)
      .map(codePoint => String.fromCodePoint(codePoint.codePointAt() + _HALF_TO_FULL_DIFF)).join('');
}

///////////////////////////////////////////////////////////////////////////////

async function isEnabled() {
  const syncViaWebdav = await getSettings();
  return syncViaWebdav.enabled && syncViaWebdav.url;
}

// Returns a string such as "User Script Name (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)".
function generateUserScriptDirectoryName(userScript) {
  const name = _prepareToConvertValidFileName(userScript.name);
  const uuid = ` (${userScript.uuid})`;
  return Array.from(name).slice(0, MAX_FILENAME_LENGTH - uuid.length).join('') + uuid;
}

// Returns a string such as "User Script Name.user.js".
function generateUserJsFileName(userScript) {
  const name = _prepareToConvertValidFileName(userScript.name);
  const extension = '.user.js';
  return Array.from(name).slice(0, MAX_FILENAME_LENGTH - extension.length).join('') + extension;
}

function getSettings() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get('syncViaWebdav', v => {
      let syncViaWebdav = v['syncViaWebdav'];
      if ('undefined' == typeof syncViaWebdav) syncViaWebdav = {
        'enabled': false,
        'url': '',
      }
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(syncViaWebdav);
      }
    });
  });
}

async function setSettings(syncViaWebdav) {
  syncViaWebdav = Object.assign(await getSettings(), syncViaWebdav);
  await new Promise((resolve, reject) => {
    chrome.storage.local.set({syncViaWebdav}, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

/** @returns {Promise.<import('../../third-party/webdav/index').WebDAVClient>} */
async function createClient() {
  return WebDAV.createClient((await getSettings()).url);
}

/** @returns {Promise.<import('../../third-party/webdav/index').FileStat[]>} */
function fetchAllItemStats() {
  return webdavClient.getDirectoryContents('/', {'deep': true, 'glob': '/*(*){,/*.user.js}'});
}

/** @returns {Promise.<import('../../third-party/webdav/index').FileStat[]>} */
async function fetchRootChildDirectoryStats() {
  return (await webdavClient.getDirectoryContents('/', {'glob': '/*(*)'})).filter(stat => stat.type === 'directory');
}

/**
 * @param {object} userScript
 * @param {import('../../third-party/webdav/index').FileStat[]} directoryStats
 * @returns {Promise.<?import('../../third-party/webdav/index').FileStat>}
 */
async function fetchUserScriptDirectoryStat(userScript, directoryStats) {
  return directoryStats.find(stat => stat.type === 'directory' && stat.basename.endsWith(`(${userScript.uuid})`));
}

/**
 * @param {object} userScript
 * @param {import('../../third-party/webdav/index').FileStat[]} itemStats
 * @returns {Promise.<?import('../../third-party/webdav/index').FileStat>}
 */
async function fetchUserJsFileStat(userScript, itemStats) {
  return (itemStats || await fetchAllItemStats())
      .find(stat => stat.type === 'file' && stat.filename.includes(`(${userScript.uuid})/`));
}

async function removeUserScriptDirectory(userScript) {
  await webdavClient.deleteFile(
      (await fetchUserScriptDirectoryStat(userScript, await fetchRootChildDirectoryStats())).filename);
}

/**
 * @param {?import('../../third-party/webdav/index').FileStat} userJsFileStat
 * @param {object} userScript
 * @param {import('../../third-party/webdav/index').FileStat[]} directoryStats
 *    - Required only when `userJsFileStat` does not specify.
 * @returns {Promise.<string>} `FileStat.filename`.
 */
async function syncToUserJsFileFromUserScript(userJsFileStat, userScript, directoryStats = null) {
  let filename;
  if (userJsFileStat) {
    filename = userJsFileStat.filename;
  } else {
    let userScriptDirectoryFilename = (await fetchUserScriptDirectoryStat(userScript, directoryStats))?.filename;
    if (!userScriptDirectoryFilename) {
      userScriptDirectoryFilename = '/' + generateUserScriptDirectoryName(userScript);
      await webdavClient.createDirectory(userScriptDirectoryFilename);
    }
    filename = userScriptDirectoryFilename + '/' + generateUserJsFileName(userScript);
  }
  await webdavClient.putFileContents(filename, userScript.content);
  return filename;
}

/**
 * @param {import('../../third-party/webdav/index').FileStat} userJsFileStat
 * @param {object} userScript
 * @returns {Promise.<void>}
 */
async function syncFromUserJsFileToUserScript(userJsFileStat, userScript) {
  const downloader = new UserScriptDownloader();
  downloader.setScriptUrl(userScript.downloadUrl);
  downloader.setScriptContent(await webdavClient.getFileContents(userJsFileStat.filename, {'format': 'text'}));

  downloader.setKnownRequires(userScript.requiresContent);
  downloader.setKnownResources(userScript.resources);
  downloader.setKnownUuid(userScript.uuid);

  try {
    await downloader.start();
    const scriptDetails = await downloader.scriptDetails;
    scriptDetails.editTime = new Date().getTime();
    scriptDetails.fileSystemEtag = userJsFileStat.etag.replace(/^W\//, '');
    scriptDetails.fileSystemLastModified = new Date(userJsFileStat.lastmod).getTime();
    await UserScriptRegistry.installFromDownloader(
        scriptDetails,
        await downloader.details(),
        {'fromSyncViaWebdav': true});
    await clearErrorNotification(userScript.uuid);
  } catch (e) {
    // Do not show the same error again.
    await setFileSystemEtagAndLastModified(userJsFileStat, userScript);

    let errorList;
    if (e instanceof DownloadError) {
      errorList = e.failedDownloads.map(d => _('ERROR_at_URL', d.error, d.url));
    } else if (e.message) {
      errorList = [e.message];
    } else {
      // Log the unknown error.
      console.error('Unknown save error saving script when sync via WebDAV', e);
      errorList = [_('download_error_unknown')];
    }

    await createErrorNotification(
        userScript.name + '\n'
          + errorList.map(error => '• ' + error).join('\n') + '\n'
          + _('fix_and_save_sync_via_webdav'),
        userScript.uuid);
  }
}

/**
 * Refetches FileStat to get new modification date,
 * and then updates the fileSystemEtag and fileSystemLastModified fields of EditableUserScript.
 * @param {import('../../third-party/webdav/index').FileStat} userJsFileStat
 * @param {object} userScript
 * @returns {Promise.<void>}
 */
async function setFileSystemEtagAndLastModified(userJsFileStat, userScript) {
  userScript.setFileSystemEtag(userJsFileStat.etag.replace(/^W\//, ''));
  userScript.setFileSystemLastModified(new Date(userJsFileStat.lastmod).getTime());
  await UserScriptRegistry.saveUserScript(userScript, {'fromSyncViaWebdav': true});
}

/**
 * Overwrites one (FileStat or EditableUserScript) having the older modified date with the other one. 
 * @param {object} userScript
 * @param {?import('../../third-party/webdav/index').FileStat[]} itemStats
 * @returns {Promise.<string>} Returns `FileStat.filename` if need set etag and last-modified to UserScriptRegistry.
 */
async function syncUserScriptWithoutPostprocessing(userScript, itemStats) {
  if (userScript.fileSystemEtag) {
    const userJsFileStat = await fetchUserJsFileStat(userScript, itemStats);
    if (userJsFileStat) {
      const userJsFileLastModified = new Date(userJsFileStat.lastmod).getTime();
      // Compare with ETag to detect file updates of less than a second.
      if (userJsFileStat.etag.replace(/^W\//, '') !== userScript.fileSystemEtag) {
        if (userJsFileLastModified < userScript.fileSystemLastModified) {
          return await syncToUserJsFileFromUserScript(userJsFileStat, userScript);
        } else if (userJsFileLastModified >= userScript.fileSystemLastModified) {
          await syncFromUserJsFileToUserScript(userJsFileStat, userScript);
          // If the update date is the same,
          // if Greasemonkey side is newer, the Etag is assumed to be the same by userScriptEdited,
          // and the file system side is treated as newer.
        }
      }
    } else {
      return await syncToUserJsFileFromUserScript(null, userScript, itemStats);
    }
  } else {
    return await syncToUserJsFileFromUserScript(null, userScript, itemStats);
  }
}

async function syncUserScripts() {
  const userScriptNeedSettingEtagAndLastModifiedFilenamePairs = new Map();

  const itemStats = await fetchAllItemStats();
  await Promise.all(Array.from(UserScriptRegistry.scriptsToRunAt(null, true)).map(async userScript => {
    const filename = await syncUserScriptWithoutPostprocessing(userScript, itemStats);
    if (filename) {
      userScriptNeedSettingEtagAndLastModifiedFilenamePairs.set(userScript, filename);
    }
  }));

  if (userScriptNeedSettingEtagAndLastModifiedFilenamePairs.size > 0) {
    if (userScriptNeedSettingEtagAndLastModifiedFilenamePairs.size === 1) {
      const [userScript, filename] = Array.from(userScriptNeedSettingEtagAndLastModifiedFilenamePairs)[0];
      await setFileSystemEtagAndLastModified(
          await webdavClient.stat(filename),
          userScript);
    } else {
      const itemStats = await fetchAllItemStats();
      for (const userScript of userScriptNeedSettingEtagAndLastModifiedFilenamePairs.keys()) {
        await setFileSystemEtagAndLastModified(await fetchUserJsFileStat(userScript, itemStats), userScript);
      }
    }
  }
}

async function enable() {
  webdavClient = await createClient();
  await monitorWebdavClient();
}

async function disable() {
  clearTimeout(timerId);
  await setSettings({'enabled': false}),
  webdavClient = null;
  timerId = 0;
}

///////////////////////////////////////////////////////////////////////////////

// Calls specified function exclusively.
// If an exception is thrown, disables sync and notifies an user of the exception.
async function transact(func) {
  await _getLock();
  try {
    const returnValue = await func();
    _releaseLock();
    return returnValue;
  } catch (e) {
    try {
      await disable();
      await createErrorNotification(builtErrorMessage(e));
    } catch (e) {
      console.error(e);
    }
    _rejectLock(e);

    console.debug(e.toString(), JSON.stringify(e, null, 2));
    throw e;
  }
}

chrome.notifications.onClosed.addListener(function (notificationId) {
  const userScriptUuid = Object.entries(userScriptUuidErrorNotificationIdPairs)
      .find(([userScriptUuid, errorNotificationId]) => errorNotificationId === notificationId)[0];
  if (userScriptUuid) {
    delete userScriptUuidErrorNotificationIdPairs[userScriptUuid];
  }
});

function createErrorNotification(message, userScriptUuid = null) {
  return new Promise(resolve => {
    chrome.notifications.create(
        userScriptUuid && userScriptUuidErrorNotificationIdPairs[userScriptUuid],
        {
          'type': 'basic',
          'iconUrl': '/skin/icon.svg',
          'title': _('sync_via_webdav_error_notification_title'),
          message,
        },
        notificationId => {
          if (userScriptUuid) {
            userScriptUuidErrorNotificationIdPairs[userScriptUuid] = notificationId;
          }
          resolve();
        });
  });
}

function clearErrorNotification(userScriptUuid) {
  const notificationId = userScriptUuidErrorNotificationIdPairs[userScriptUuid];
  if (!notificationId) {
    return;
  }
  delete userScriptUuidErrorNotificationIdPairs[userScriptUuid];
  return new Promise(resolve => {
    chrome.notifications.clear(notificationId, () => resolve());
  });
}

function builtErrorMessage(e) {
  let message = e.toString();

  if ('response' in e) {
    /** @type {?import('../../third-party/webdav/index').Response} */
    const response = e.response;
    const data = response?.data;
    if (data && typeof data === 'string') {
      let body;
      const type = response.headers['content-type'];
      if (type.startsWith('text/html') || type.startsWith('application/xhtml+xml')) {
        const doc = new DOMParser().parseFromString(
            data,
            type.startsWith('text/html') ? 'text/html' : 'application/xhtml+xml');
        body = [doc.title, doc.body?.innerText].filter(text => text).map(text => text.trim()).join('\n');
      }
      message += '\n' + (body || data);
    }
  }
  
  return message;
}

// This function is called every DIRECTORY_MONITOR_INTERVAL milliseconds.
async function monitorWebdavClient() {
  await syncUserScripts();

  timerId = setTimeout(() => {
    transact(async () => {
      if (await isEnabled()) {
        await monitorWebdavClient();
      }
    });
  }, DIRECTORY_MONITOR_INTERVAL);
}

function onSyncViaWebdavChangeOption(message, sender, sendResponse) {
  return transact(async () => {
    const previousEnabled = await isEnabled();

    if ('enabled' in message) {
      if (message.enabled) {
        await setSettings({'enabled': message.enabled});
        if (!previousEnabled && await isEnabled()) {
          await enable();
        }
      } else {
        await disable();
      }
    } else if ('url' in message) {
      await setSettings({'url': message.url});
      const settings = await getSettings();
      if (settings.url) {
        if (settings.enabled) {
          if (previousEnabled) {
            await disable();
          }
          await enable();
        }
      } else {
        if (previousEnabled) {
          await disable();
        }
      }
    }

    return getSettings();
  });
}
window.onSyncViaWebdavChangeOption = onSyncViaWebdavChangeOption;

function run() {
  return transact(async () => {
    if (await isEnabled()) {
      await enable();
    }
  });
}

function userScriptEdited(userScript) {
  transact(async () => {
    if (await isEnabled()) {
      const itemStats = await fetchAllItemStats();
      const userJsFileStat = await fetchUserJsFileStat(userScript, itemStats);
      const filename = await syncToUserJsFileFromUserScript(
          userJsFileStat,
          userScript,
          itemStats); // Specify for if a file is deleted at the same time as editing.
      await setFileSystemEtagAndLastModified(
          await webdavClient.stat(filename),
          userScript);
      await clearErrorNotification(userScript.uuid);
    }
  });
}

function userScriptUninstalled(userScript) {
  transact(async () => {
    if (await isEnabled()) {
      await removeUserScriptDirectory(userScript);
      await clearErrorNotification(userScript.uuid);
    }
  });
}


// Export public API.
window.SyncViaWebdav = {
  '_run': run,
  'userScriptEdited': userScriptEdited,
  'userScriptUninstalled': userScriptUninstalled,
};

})();
