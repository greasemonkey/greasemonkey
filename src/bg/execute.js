'use strict';
/*
This file is responsible for observing content navigation events and triggering
content script executions.

TODO: Make document_start execution time work as intended.
*/

async function executeUserscriptOnNavigation(detail) {
  if (false === getGlobalEnabled()) return;

  await userScriptsReady;
  const userScriptIterator = UserScriptRegistry.scriptsToRunAt(detail.url);
  for (let userScript of userScriptIterator) {
    let options = {
      'code': userScript.evalContent,
      'matchAboutBlank': true,
      'runAt': 'document_' + userScript.runAt,
    };
    if (detail.frameId) options.frameId = detail.frameId;
    chrome.tabs.executeScript(detail.tabId, options, () => {
      if (!chrome.runtime.lastError) return;
      const errMsg = chrome.runtime.lastError.message;

      // TODO: i18n?
      if (errMsg.startsWith('Message manager disconnected')) return;
      if (errMsg.startsWith('No matching message handler')) return;

      // TODO: Better indication of the root cause.
      console.error(
          'Could not execute', userScript.toString(), '\n', errMsg);
    });
  }
}
