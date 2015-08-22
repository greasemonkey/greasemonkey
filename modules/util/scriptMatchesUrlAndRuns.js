const EXPORTED_SYMBOLS = ['scriptMatchesUrlAndRuns'];

Components.utils.import('resource://greasemonkey/util.js');

var gStringBundle = Components
    .classes["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .createBundle("chrome://greasemonkey/locale/greasemonkey.properties");

var GM_GUID = "{e4a8a97b-f2ed-450b-b12d-ee082ba24781}";
var gGreasemonkeyVersion = "unknown";
Components.utils.import("resource://gre/modules/AddonManager.jsm");
AddonManager.getAddonByID(GM_GUID, function(addon) {
  gGreasemonkeyVersion = "" + addon.version;
});

function scriptMatchesUrlAndRuns(script, url, when) {
  var result = !script.pendingExec.length
      && script.enabled
      && !script.needsUninstall
      && (script.runAt == when || "any" == when)
      && script.matchesURL(url);

  var minFFVer = true;
  var minGMVer = true;

  if (result && ("null" !== script.minFFVer)
      && (GM_util.compareFirefoxVersion(script.minFFVer) < 0)) {
    GM_util.logError(
        gStringBundle.GetStringFromName("run.ff-failed")
            .replace('%1', script.name)
            .replace('%2', script.minFFVer),
      true, // is a warning
      script.fileURL,
      null
    );
    minFFVer = false;
  }

  var versionChecker = Components
      .classes["@mozilla.org/xpcom/version-comparator;1"]
      .getService(Components.interfaces.nsIVersionComparator);
  if (result && ("null" !== script.minGMVer)
      && (versionChecker.compare(gGreasemonkeyVersion, script.minGMVer) < 0)) {
    GM_util.logError(
        gStringBundle.GetStringFromName("run.gm-failed")
            .replace('%1', script.name)
            .replace('%2', script.minGMVer),
      true, // is a warning
      script.fileURL,
      null
    );
    minGMVer = false;
  }

  return result
      && minFFVer
      && minGMVer;
}
