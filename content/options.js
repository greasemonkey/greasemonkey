var GM_setOptionsYet = false;
function GM_onloadOptions() {
  document.getElementById("check-uninstall")
      .checked = GM_prefRoot.getValue("uninstallPreferences");

  document.getElementById("check-update")
      .checked = GM_prefRoot.getValue("enableUpdateChecking");

  document.getElementById("slide-updateInterval")
      .value = GM_prefRoot.getValue("minIntervalBetweenUpdateChecks");

  document.getElementById("txt-updateInterval")
      .setAttribute("label", GM_prefRoot.getValue("minIntervalBetweenUpdateChecks"));
  GM_setOptionsYet = true;
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
  if (!GM_setOptionsYet) return;
  var days = parseInt(document.getElementById("slide-updateInterval").value);

  document.getElementById("txt-updateInterval")
    .setAttribute("label", days);
  GM_prefRoot.setValue("minIntervalBetweenUpdateChecks", days);
}