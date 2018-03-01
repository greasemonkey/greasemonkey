/*
This file is responsible for observing content navigation events and triggering
content script executions.

TODO: Make document_start execution time work as intended.
*/

function executeUserscriptOnNavigation(details) {
  if (false === getGlobalEnabled()) return;

  let userScriptIterator = UserScriptRegistry.scriptsToRunAt(details.url);
  for (let userScript of userScriptIterator) {
    let options = {
      'code': userScript.evalContent,
      'matchAboutBlank': true,
      'runAt': 'document_' + userScript.runAt,
    };
    if (details.frameId) options.frameId = details.frameId;
    chrome.tabs.executeScript(details.tabId, options, result => {
      let err = chrome.runtime.lastError;
      if (!err) return;

      // TODO: i18n?
      if (err.message.startsWith('Message manager disconnected')) return;
      if (err.message.startsWith('No matching message handler')) return;

      // TODO: Better indication of the root cause.
      console.error(
          'Could not execute user script', userScript.toString(), '\n', err);
    });
  }

  // TODO: Optional feature.
  updateBadgeByDetails(details);
}


function updateBadgeByDetails(details) {
  if (false === getGlobalEnabled()) return;

  let userScriptIterator = UserScriptRegistry.scriptsToRunAt(details.url);
  let count = 0;
  for (let userScript of userScriptIterator) count++;
  if (count) {
    chrome.browserAction.setBadgeBackgroundColor({'color': 'black', 'tabId': details.tabId});
    chrome.browserAction.setBadgeText({'text': String(count), 'tabId': details.tabId});
  } else {
    chrome.browserAction.setBadgeText({'text': null, 'tabId': details.tabId});
  }
}
