Components.utils.import('resource://greasemonkey/prefmanager.js');
Components.utils.import('resource://greasemonkey/util.js');

function GM_loadOptions() {
  document.getElementById('check-uninstall')
      .checked = GM_prefRoot.getValue('uninstallPreferences');

  document.getElementById('globalExcludes')
      .pages = GM_util.getService().config.globalExcludes;

  document.getElementById('check-update')
      .checked = GM_prefRoot.getValue('enableUpdateChecking');

  document.getElementById('slide-updateInterval')
      .value = GM_prefRoot.getValue('minDaysBetweenUpdateChecks');

  GM_setMinUpdateIntervalLabel();
}

function GM_saveOptions(checkbox) {
  GM_prefRoot.setValue('uninstallPreferences',
      !!document.getElementById('check-uninstall').checked);
  GM_util.getService().config.globalExcludes =
      document.getElementById('globalExcludes').pages;
  GM_prefRoot.setValue('enableUpdateChecking',
      !!document.getElementById('check-update').checked);
  GM_prefRoot.setValue("minDaysBetweenUpdateChecks", GM_getMinUpdateDays());
}

function GM_getMinUpdateDays() {
  return parseInt(document.getElementById('slide-updateInterval').value);
}

function GM_setMinUpdateIntervalLabel() {
  document.getElementById('txt-updateInterval')
      .setAttribute('value', GM_getMinUpdateDays());
}
