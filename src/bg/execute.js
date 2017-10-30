/*
This file is responsible for observing content navigation events and triggering
content script executions.

TODO: Make document_start execution time work as intended.
*/

function executeUserscriptOnResponseStarted(detail) {
  if (false === getGlobalEnabled()) return;

  var userScriptIterator = UserScriptRegistry.scriptsToRunAt(detail.url);
  for (let userScript of userScriptIterator) {
    let options = {
      'code': userScript.evalContent,
      'matchAboutBlank': true,
      'runAt': 'document_' + userScript.runAt,
    };
    if (detail.frameId) {
        if (userScript.noFrames) return;
        options.frameId = detail.frameId;
    }
    chrome.tabs.executeScript(detail.tabId, options, result => {
      let err = chrome.runtime.lastError;
      if (!err) return;
      if (err.message.startsWith('Message manager disconnected')) return;
      if (err.message.startsWith('No matching message handler')) return;
      // TODO: Better indication of the root cause.
      console.error(
          'Could not execute user script: ' + userScript.toString(),
          '\n', err);
    });
  }
}
