Components.utils.import('resource://greasemonkey/prefmanager.js');
Components.utils.import('resource://greasemonkey/util.js');

function GM_loadOptions() {
  document.getElementById('check-sync')
      .checked = GM_prefRoot.getValue('sync.enabled');
  document.getElementById('secure-update')
      .checked = GM_prefRoot.getValue('requireSecureUpdates');
  document.getElementById('timeout-update')
      .checked = GM_prefRoot.getValue('requireTimeoutUpdates');
  var timeoutUpdatesInSeconds = GM_prefRoot.getValue('timeoutUpdatesInSeconds');
  timeoutUpdatesInSeconds = isNaN(parseInt(timeoutUpdatesInSeconds, 10))
                            ? 3 : parseInt(timeoutUpdatesInSeconds, 10);
  timeoutUpdatesInSeconds = timeoutUpdatesInSeconds >= 1
                            && timeoutUpdatesInSeconds <= 60
                            ? timeoutUpdatesInSeconds : 3;
  document.getElementById('timeout-update-value')
      .value = timeoutUpdatesInSeconds;
  document.getElementById('submit-stats')
      .checked = GM_prefRoot.getValue('stats.optedin');
  document.getElementById('globalExcludes')
      .pages = GM_util.getService().config.globalExcludes;
  document.getElementById('newScript-removeUnused')
      .checked = GM_prefRoot.getValue('newScript.removeUnused');
  document.getElementById('newScript-template')
      .value = GM_prefRoot.getValue('newScript.template');
}

function GM_saveOptions(checkbox) {
  GM_prefRoot.setValue('sync.enabled',
      !!document.getElementById('check-sync').checked);
  GM_prefRoot.setValue('requireSecureUpdates',
      !!document.getElementById('secure-update').checked);
  GM_prefRoot.setValue('requireTimeoutUpdates',
      !!document.getElementById('timeout-update').checked);
  GM_prefRoot.setValue('timeoutUpdatesInSeconds',
      parseInt(document.getElementById('timeout-update-value').value, 10));
  GM_prefRoot.setValue('stats.optedin',
      !!document.getElementById('submit-stats').checked);
  GM_util.getService().config.globalExcludes =
      document.getElementById('globalExcludes').pages;
  GM_prefRoot.setValue('newScript.removeUnused',
      !!document.getElementById('newScript-removeUnused').checked);
  GM_prefRoot.setValue('newScript.template',
      document.getElementById('newScript-template').value);
}
