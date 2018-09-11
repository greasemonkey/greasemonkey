'use strict';
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
    chrome.tabs.executeScript(details.tabId, options, () => {
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

  let runActive = 0;
  let runTotal = 0;
  let totalActive = 0;
  let total = 0;
  const enabled = true;  // TODO: query ('EnabledQuery' not yet available).
  if (enabled) {
    const allScripts = UserScriptRegistry.scriptsToRunAt(null, true);
    const url = details.url && new URL(details.url);
    for (let script of allScripts) {
      const running = url && script.runsAt(url);
      if (running && script.enabled) runActive++;
      if (running) runTotal++;
      if (script.enabled) totalActive++;
      total++;
    }
    const toolTip = [_('extName'),
        _('DETECTED_ALL_stats_active', runActive, totalActive),
        _('DETECTED_ALL_stats_total', runTotal, total)].join('\n   ');
    chrome.browserAction.setTitle({
        'title': toolTip,
        'tabId': details.tabId});
  } else {
    chrome.browserAction.setTitle({
        'title': _('extName'),
        'tabId': details.tabId});
  }

  if (runActive) {
    chrome.browserAction.setBadgeBackgroundColor({
        'color': 'black',
        'tabId': details.tabId});
    chrome.browserAction.setBadgeText({
        'text': String(runActive),
        'tabId': details.tabId});
  } else {
    chrome.browserAction.setBadgeText({
        'text': '',  // Should be null for FF 59+.
        'tabId': details.tabId});
  }
}
