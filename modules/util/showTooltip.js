Components.utils.import("resource://greasemonkey/prefmanager.js");
Components.utils.import("resource://greasemonkey/util.js");
var stringBundleBrowser = Components
    .classes["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .createBundle("chrome://greasemonkey/locale/gm-browser.properties");

const EXPORTED_SYMBOLS = ["showTooltip"];

function showTooltip(event, target) {
  var version = GM_prefRoot.getValue("version");
  var versionElm = target.getElementsByClassName("greasemonkey-tooltip-version")[0];
  versionElm.setAttribute("value",
    stringBundleBrowser.GetStringFromName("tooltip.greasemonkeyVersion")
      .replace("%1", version)
  );

  var enabled = GM_util.getEnabled();
  var enabledElm = target.getElementsByClassName("greasemonkey-tooltip-enabled")[0];
  enabledElm.setAttribute("value", enabled
    ? stringBundleBrowser.GetStringFromName("tooltip.enabled")
    : stringBundleBrowser.GetStringFromName("tooltip.disabled")
  );

  if (enabled) {
    target.classList.add('greasemonkey-tooltip-isActive');

    var svc = GM_util.getService();

    var total = svc.config.scripts.length;
    var totalElm = target.getElementsByClassName("greasemonkey-tooltip-total")[0];
    totalElm.setAttribute("value",
      stringBundleBrowser.GetStringFromName("tooltip.total")
          .replace("%1", total)
    );

    var active = svc.activeScripts().length;
    var activeElm = target.getElementsByClassName("greasemonkey-tooltip-active")[0];
    activeElm.setAttribute("value",
      stringBundleBrowser.GetStringFromName("tooltip.active")
          .replace("%1", active)
    );
  } else {
    target.classList.remove('greasemonkey-tooltip-isActive');
  }

  return true;
}