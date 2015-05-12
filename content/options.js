Components.utils.import('resource://greasemonkey/prefmanager.js');
Components.utils.import('resource://greasemonkey/util.js');

function GM_loadOptions() {
  document.getElementById('check-sync')
      .checked = GM_prefRoot.getValue('sync.enabled');
  document.getElementById('secure-update')
      .checked = GM_prefRoot.getValue('requireSecureUpdates');
  document.getElementById('submit-stats')
      .checked = GM_prefRoot.getValue('stats.optedin');
  document.getElementById('globalExcludes')
      .pages = GM_util.getService().config.globalExcludes;
  document.getElementById('newScript-removeUnused')
      .checked = GM_prefRoot.getValue('newScript.removeUnused');
  document.getElementById('newScript-template')
      .value = GM_prefRoot.getValue('newScript.template');
  document.getElementById('check-tldWhitelist-match')
      .checked = GM_prefRoot.getValue('tldWhitelist.match.enabled');
  document.getElementById('tldWhitelist-match')
      .value = GM_prefRoot.getValue('tldWhitelist.match');
}

function GM_saveOptions(checkbox) {
  GM_prefRoot.setValue('sync.enabled',
      !!document.getElementById('check-sync').checked);
  GM_prefRoot.setValue('requireSecureUpdates',
      !!document.getElementById('secure-update').checked);
  GM_prefRoot.setValue('stats.optedin',
      !!document.getElementById('submit-stats').checked);
  GM_util.getService().config.globalExcludes =
      document.getElementById('globalExcludes').pages;
  GM_prefRoot.setValue('newScript.removeUnused',
      !!document.getElementById('newScript-removeUnused').checked);
  GM_prefRoot.setValue('newScript.template',
      document.getElementById('newScript-template').value);
  GM_prefRoot.setValue('tldWhitelist.match.enabled',
      !!document.getElementById('check-tldWhitelist-match').checked);
  GM_prefRoot.setValue('tldWhitelist.match',
      document.getElementById('tldWhitelist-match').value);
}
