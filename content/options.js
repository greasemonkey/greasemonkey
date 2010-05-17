function GM_onloadOptions() {
  document.getElementById("check-uninstall")
      .checked = GM_prefRoot.getValue("uninstallPreferences");

  document.getElementById("check-update")
      .checked = GM_prefRoot.getValue("enableUpdateChecking");

  document.getElementById("txt-updateInterval")
      .value = GM_prefRoot.getValue("minIntervalBetweenUpdateChecks");
}

function GM_setUninstallPrefs(checkbox) {
  GM_prefRoot.setValue("uninstallPreferences",
      !!document.getElementById("check-uninstall").checked);
}

function GM_setUpdatePrefs(checkbox) {
  GM_prefRoot.setValue("enableUpdateChecking",
      !!document.getElementById("check-update").checked);
}

function GM_setMinUpdateInterval(input) {
  var days = parseFloat(document.getElementById("txt-updateInterval").value);
  if (isNaN(days) || days < 1) return;

  GM_prefRoot.setValue("minIntervalBetweenUpdateChecks", days);
}