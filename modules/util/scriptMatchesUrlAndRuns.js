const EXPORTED_SYMBOLS = ['scriptMatchesUrlAndRuns'];

function scriptMatchesUrlAndRuns(script, url, when) {
  return !script.pendingExec.length
      && script.enabled
      && !script.needsUninstall
      && (script.runAt == when || 'any' == when)
      && script.matchesURL(url);
}
