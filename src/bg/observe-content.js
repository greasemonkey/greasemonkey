/*
This file is responsible for observing content navigation events and triggering
content script executions.

TODO: Make document_start execution time work as intended.
*/

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
      var r = browser.tabs.executeScript(detail.tabId, options);
      r.then(v => console.log('execute result?', r, v));
    } catch (e) {
      console.error(e);
    }
  }
});
