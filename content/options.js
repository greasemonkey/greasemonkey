Components.utils.import('resource://greasemonkey/prefmanager.js');
Components.utils.import('resource://greasemonkey/util.js');

function GM_loadOptions() {
  document.getElementById("check-uninstall")
      .checked = GM_prefRoot.getValue("uninstallPreferences");
  document.getElementById("globalExcludes")
      .pages = GM_util.getService().config.globalExcludes;
}

function GM_saveOptions(checkbox) {
  GM_prefRoot.setValue("uninstallPreferences",
      !!document.getElementById("check-uninstall").checked);
  GM_util.getService().config.globalExcludes =
      document.getElementById("globalExcludes").pages;
}
