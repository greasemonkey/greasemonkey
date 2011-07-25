function GM_loadOptions() {
  document.getElementById("check-uninstall")
      .checked = GM_prefRoot.getValue("uninstallPreferences");
  document.getElementById("globalExcludes")
      .pages = GM_getConfig().globalExcludes;
}

function GM_saveOptions(checkbox) {
  GM_prefRoot.setValue("uninstallPreferences",
      !!document.getElementById("check-uninstall").checked);
  GM_getConfig().globalExcludes =
      document.getElementById("globalExcludes").pages;
}
