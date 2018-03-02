/*
This file is responsible for observing content navigation events and triggering
content script executions.

TODO: Make document_start execution time work as intended.
*/

function executeUserscriptOnNavigation(details) {
  if (false === getGlobalEnabled()) return;

  const userScriptIterator = UserScriptRegistry.scriptsToRunAt(details.url);
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

  // TODO: User configurable feature.
  updateScriptStatsByDetails(details);
}


function updateScriptStatsByDetails(details) {
  if (false === getGlobalEnabled()) return;
  if (0 !== details.frameId) return;

  const enabled = true;  // TODO: query ('EnabledQuery' not yet available).
  let count = [[0, 0], [0, 0]];
  if (enabled) {
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const url = (i ? details.url : null);
        const all = !j;
        const userScriptIterator = UserScriptRegistry.scriptsToRunAt(url, all);
        for (let userScript of userScriptIterator) ++count[i][j];
      }
    }
    const toolTip = [_('extName'),
        _('DETECTED_ALL_stats_active', count[1][1], count[0][1]),
        _('DETECTED_ALL_stats_total', count[1][0], count[0][0])].join('\n   ');
    chrome.browserAction.setTitle({
        'title': toolTip,
        'tabId': details.tabId});
  } else {
    chrome.browserAction.setTitle({
        'title': _('extName'),
        'tabId': details.tabId});
  }

  if (count[1][1]) {  // Any detected[1] and activated[1] scripts running?
    chrome.browserAction.setBadgeBackgroundColor({
        'color': 'black',
        'tabId': details.tabId});
    chrome.browserAction.setBadgeText({
        'text': String(count[1][1]),
        'tabId': details.tabId});
  } else {
    chrome.browserAction.setBadgeText({
        'text': '',  // Should be null for FF 59+.
        'tabId': details.tabId});
  }
}
