/*
This file is responsible for observing content navigation events and triggering
content script executions.

TODO: Make document_start execution time work as intended.
*/

// Private implementation.
(function() {

let openPorts = [];
let pendingPorts = {};

browser.webNavigation.onCommitted.addListener(detail => {
  var userScriptIterator = UserScriptRegistry.scriptsToRunAt(detail.url);
  for (let userScript of userScriptIterator) {
    let options = {
      'code': userScript.evalContent,
      'matchAboutBlank': true,
      'runAt': 'document_' + userScript.runAt,
    };
    if (detail.frameId) options.frameId = detail.frameId;
    browser.tabs.executeScript(detail.tabId, options)
      .catch(err => {
      if (err.message.startsWith('Message manager disconnected')) return;
      if (err.message.startsWith('No matching message handler')) return;
      // TODO: Better indication of the root cause.
      console.error(
          'Could not execute user script: ' + userScript.toString(),
          '\n', err);
    });
  }
});

})();
