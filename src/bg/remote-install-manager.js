/* Functions for managing remote (navigation) script installs */

(function() {

// Open platform specific installation dialog
function openInstallDialog(scriptDetails, url) {
  return browser.runtime.getPlatformInfo().then(platform => {
    let installUrl = browser.runtime.getURL('src/content/install-dialog.html')
        + '?' + escape(JSON.stringify(scriptDetails));

    if ('android' === platform.os) {
      return browser.tabs.create({'active': true, 'url': installUrl});
    } else {
      let options = {
        'height': 640,
        'titlePreface': _('$1 - Greasemonkey User Script', scriptDetails.name),
        'type': 'popup',
        'url': installUrl,
        'width': 480,
      };
      return browser.windows.create(options).then(nWindow => {
        // Fix for Fx57 bug where bundled page loaded using
        // browser.windows.create won't show contents unless resized.
        // See https://bugzilla.mozilla.org/show_bug.cgi?id=1402110
        return browser.windows.update(nWindow.id, {width: nWindow.width + 1});
      });
    }
  });
}

// ############################ GLOBAL LISTENERS ############################ \\

// Map of request -> ScriptInstaller
let scriptProcessors = new Map();

// Create and track a new script installer for a given request Id
function downloadForRequest(responseDetails, scriptDetails, contentPromise) {
  let id = `${scriptDetails.namespace}/${scriptDetails.name}`;
  let requestId = responseDetails.requestId;
  let userScript = UserScriptRegistry.scriptById(id);
  let processor;
  // If the script id exists treat the navigation as an 'update'
  if (userScript) {
    processor =
        new ScriptUpdater(userScript, scriptDetails, contentPromise, requestId);
  } else {
    processor = new ScriptInstaller(scriptDetails, contentPromise, requestId);
  }
  let pInfo = {'processor': processor, 'progress': [0]};
  scriptProcessors.set(requestId, pInfo);
  scriptDetails.requestId = requestId;

  openInstallDialog(scriptDetails, responseDetails.url)
      .then(processor.run.bind(processor))
      .catch(err => sendError(requestId, err));
}


function reportDownloadProgress(requestId, progress) {
  let pInfo = scriptProcessors.get(requestId);
  // Progress does not need to be reported if pInfo is unavailable
  if (!pInfo) return;

  // All other indices in the progress array represent the individual
  // progress for each download.
  progress.unshift(pInfo.progress[0]);
  pInfo.progress = progress;
  sendProgress(requestId, pInfo);
}


function reportRequestProgress(requestId, progress) {
  let pInfo = scriptProcessors.get(requestId);
  // Progress does not need to be reported if pInfo is unavailable
  if (!pInfo) return;

  // The first index in the progress array represents the progress from the
  // initial navigation.
  pInfo.progress[0] = progress;
  sendProgress(requestId, pInfo);
}


// Apply public API
window.ScriptInstall = {
  'downloadForRequest': downloadForRequest,
  'reportDownloadProgress': reportDownloadProgress,
  'reportRequestProgress': reportRequestProgress,
};

// ############################# PORT MESSAGES ############################## \\

// First message that should be received. Includes requestId in order to save
// the port in the Map object. Once set the function is no longer needed as a
// listener on the port.
function receiveConnect(message, port) {
  port.onMessage.removeListener(receiveConnect);

  let requestId = message.requestId;
  let pInfo = scriptProcessors.get(requestId);
  // If there is no pInfo then the objects are dead. No further action.
  if (!pInfo) {
    port.disconnect();
    return;
  }

  // Apply the disconnect listener
  port.onDisconnect
      .addListener(() => closeRemoteDialogConnection(requestId, port));
  // The only other message that should be received from the port is to save
  // the user script.
  port.onMessage.addListener(() => receiveScriptConfirm(requestId, port));

  pInfo.port = port;
  if (pInfo.error) {
    // If pInfo has an error it was never sent because 'port' was undefined.
    // Send it now.
    scriptProcessors.set(requestId, pInfo);
    sendError(requestId, pInfo.error);
  } else {
    // Otherwise send a forced progress update. Just in case the 100%
    // message was missed.
    sendProgress(requestId, pInfo);
  }
}


function receiveScriptConfirm(requestId, port) {
  let pInfo = scriptProcessors.get(requestId);
  // No pInfo indicates that the objects are already dead. No further action.
  if (!pInfo) return;

  pInfo.saved = true;
  scriptProcessors.set(requestId, pInfo);

  pInfo.processor.save()
      .then(() => port.postMessage({'type': 'finish'}))
      .catch(err => sendError(requestId, err));
}


function sendError(requestId, err) {
  let pInfo = scriptProcessors.get(requestId);
  // No pInfo indicates that the objects are already dead. No further action.
  if (!pInfo) return;

  pInfo.error = err;
  if (pInfo.port) {
    pInfo.port.postMessage({'type': 'error', 'errors': [err.message]});
  }
}


function sendProgress(requestId, pInfo) {
  scriptProcessors.set(requestId, pInfo);
  if (pInfo && pInfo.port) {
    let total =
        pInfo.progress.reduce((a, v) => v += a) / pInfo.progress.length;
    pInfo.port.postMessage({'type': 'progress', 'progress': total});
  }
}

// ########################### PORT CONNECTIONS ############################# \\

// Port.onDisconnect
function closeRemoteDialogConnection(requestId, port) {
  // Last chance to do any cleanup
  let pInfo = scriptProcessors.get(requestId);
  // No pInfo indicates that the objects are already dead. No further action.
  if (!pInfo) return;

  if (!pInfo.saved) {
    pInfo.processor.abort();
  }
  scriptProcessors.delete(requestId);
}


function openRemoteDialogConnection(port) {
  if (!port.name === 'RemoteInstallDialog') return;
  port.onMessage.addListener(receiveConnect);
}
chrome.runtime.onConnect.addListener(openRemoteDialogConnection);

})();
