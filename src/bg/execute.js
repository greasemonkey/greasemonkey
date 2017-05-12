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
    try {
      let options = {
        'code': userScript.evalContent,
        'matchAboutBlank': true,
        'runAt': 'document_' + userScript.runAt
      };
      if (detail.frameId) options.frameId = detail.frameId;
      browser.tabs.executeScript(detail.tabId, options)
          .then(result => {
//            console.log('execute result?', result),
          }, error => {
//            console.error(
//                'Could not execute ' + userScript.name + ':', error);
          });
    } catch (e) {
      console.error('Could not execute user script:', e);
    }
  }
});

})();
