// Private implementation.
(function() {

const CHANGE_RATE = 1.25;
const MAX_UPDATE_IN_MS = (1000 * 60 * 60 * 24 * 7);
const MIN_UPDATE_IN_MS = (1000 * 60 * 60 * 3);


let gTimer = null;


function checkForUpdate(uuid) {
  return new Promise((resolve, reject) => {
    let userScript = UserScriptRegistry.scriptByUuid(uuid);
    if (!userScript) {
      // Uninstalled since the update check was queued.
      resolve({'result': 'ignore'});
      return;
    }

    let windowKey = 'updateWindow.' + uuid;
    chrome.storage.local.get(windowKey, windowVal => {
      let abort = false;
      let downloader = new UserScriptDownloader();
      downloader.setScriptUrl(userScript.downloadUrl);
      downloader.start(details => {
        // `compareVersions()` returns -1 when its second argument is "larger".
        let comparison = compareVersions(userScript.version, details.version);
        // So we should abort if we don't get -1.
        abort = comparison !== -1;
        // Return false here will stop the downloader -- skipping e.g.
        // @require, @icon, etc. downloads. So we should return "not abort".
        return !abort;
      }).then(async () => {
        let updateWindowMs = windowVal[windowKey] || MAX_UPDATE_IN_MS;
        if (abort) {
          // There was no update.  Wait longer before checking again.
          updateWindowMs *= CHANGE_RATE;
        } else {
          // There was an update.  Check again, soon.  On the theory that
          // when a user script changes, it usually changes in bursts.
          updateWindowMs = MIN_UPDATE_IN_MS;
          await downloader.installFromBackground('install');
        }
        updateWindowMs = Math.min(updateWindowMs, MAX_UPDATE_IN_MS);
        updateWindowMs = Math.max(updateWindowMs, MIN_UPDATE_IN_MS);
        updateWindowMs = fuzz(updateWindowMs);

        let d = {};
        d[windowKey] = updateWindowMs;
        d['updateNextAt.' + uuid] = new Date().getTime() + updateWindowMs;
        chrome.storage.local.set(d, logUnhandledError);

        if (abort) {
          resolve({'result': 'noupdate'});
        } else {
          let details = await downloader.scriptDetails;
          resolve({'result': 'updated', 'details': details});
        }
      }).catch(e => {
        reject({'result': 'error', 'message': e});
      });
    });
  });
}


function fuzz(num) {
  return num * (Math.random() * 0.1 + 0.95);
}


window.onUserScriptUpdateNow = function(message, sender, sendResponse) {
  checkForUpdate(message.uuid)
      .then(r => sendResponse(r))
      .catch(r => sendResponse(r));
};


/** Visible only for testing! */
window._pickNextScriptAutoUpdate = async function() {
  return new Promise((resolve, reject) => {
    let nextTime = null;
    let nextUuid = null;

    let updateNextAtKeys = [];
    let userScriptIterator = UserScriptRegistry.scriptsToRunAt();
    for (let userScript of userScriptIterator) {
      if (!userScript.downloadUrl) continue;
      if (userScript.hasBeenEdited) continue;
      updateNextAtKeys.push('updateNextAt.' + userScript.uuid);
    }
    if (updateNextAtKeys.length == 0) {
      reject(new Error('no scripts to update'));
      return;
    }

    let defaultCheckTime = new Date().getTime() + MIN_UPDATE_IN_MS;
    chrome.storage.local.get(updateNextAtKeys, vs => {
      for (let k of updateNextAtKeys) {
        let uuid = k.replace('updateNextAt.', '');
        let v = vs[k];

        if (!nextTime || !nextUuid || v < nextTime) {
          nextTime = v || defaultCheckTime;
          nextUuid = uuid;
        }
      }

      if (nextUuid) {
        resolve([nextUuid, nextTime]);
      } else {
        reject('Could not find next script to update.');
      }
    });
  });
};

window.scheduleNextScriptAutoUpdate = async function() {
  let nextUuid, nextTime;
  try {
    [nextUuid, nextTime] = await _pickNextScriptAutoUpdate();
  } catch (e) {
    setTimeout(scheduleNextScriptAutoUpdate, fuzz(1000 * 60 * 15));
    return;
  }

  let delay = nextTime - new Date().getTime();
  delay = Math.max(10000, delay);
  gTimer = setTimeout(async (nextUuid) => {
    await checkForUpdate(nextUuid);
    await scheduleNextScriptAutoUpdate();
  }, delay, nextUuid);
};

})();
