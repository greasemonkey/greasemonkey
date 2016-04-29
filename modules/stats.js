/*
This module implements the reporting side of the pseudo-anonymous usage
statistic gathering first described at:
https://github.com/greasemonkey/greasemonkey/issues/1651

It does not export anything.  It only sets an interval and periodically does
the work to send data to the server.
*/
var EXPORTED_SYMBOLS = [];

Components.utils.import('resource://services-common/utils.js');
Components.utils.import('chrome://greasemonkey-modules/content/miscapis.js');
Components.utils.import('chrome://greasemonkey-modules/content/parseScript.js');
Components.utils.import('chrome://greasemonkey-modules/content/prefmanager.js');
Components.utils.import("chrome://greasemonkey-modules/content/storageBack.js");
Components.utils.import('chrome://greasemonkey-modules/content/util.js');

var gPrefMan = new GM_PrefManager();
var gStringBundle = Components
    .classes["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .createBundle("chrome://greasemonkey/locale/greasemonkey.properties");
var gTldService = Components
    .classes["@mozilla.org/network/effective-tld-service;1"]
    .getService(Components.interfaces.nsIEffectiveTLDService);

// Check once, soon.
GM_util.timeout(check, 1000 * 10); // ms = 10 seconds
// And forever, as long as the browser stays open.
GM_util.timeout(
    check, 1000 * 60 * 60,  // ms = 1 hour
    Components.interfaces.nsITimer.TYPE_REPEATING_PRECISE_CAN_SKIP);


function check() {
  if (!gPrefMan.getValue('stats.optedin')) {
    promptUser();
    return;
  }

  var lastSubmit = new Date(gPrefMan.getValue('stats.lastsubmittime'));
  var nextSubmit = new Date(
      (lastSubmit.valueOf()) + gPrefMan.getValue('stats.interval'));
  var now = new Date();

  if (nextSubmit > now) return;

  if (!gPrefMan.getValue('stats.id')) {
    var rng = Components.classes["@mozilla.org/security/random-generator;1"]
        .createInstance(Components.interfaces.nsIRandomGenerator);
    var bytes = rng.generateRandomBytes(18);
    var id = CommonUtils.encodeBase64URL(CommonUtils.byteArrayToString(bytes));
    gPrefMan.setValue('stats.id', id);
  }

  try {
    submit();
  } catch (e) {
    // Ignore errors, just log.
    GM_util.logError(e);
  }

  gPrefMan.setValue('stats.lastsubmittime', now.toString());
}


function submit() {
  var url = gPrefMan.getValue('stats.url') + gPrefMan.getValue('stats.id');
  var stats = JSON.stringify(getStatsObj());

  var req = Components.classes['@mozilla.org/xmlextras/xmlhttprequest;1']
      .createInstance(Components.interfaces.nsIXMLHttpRequest);
  req.open('POST', url, true);
  req.onload = GM_util.hitch(null, submitOnload, req);
  req.send(stats);
}


function submitOnload(req) {
  if (!req.responseText) return;
  try {
    var response = JSON.parse(req.responseText);
    if (response.interval) {
      gPrefMan.setValue('stats.interval', response.interval);
    }
  } catch (e) {
    GM_util.logError('stats submitOnload: Couldn\'t handle response: ' + e);
  }
}

function getStatsObj() {
  var xulAppInfo = Components.classes["@mozilla.org/xre/app-info;1"]
      .getService(Components.interfaces.nsIXULAppInfo);
  var xulRuntime = Components.classes["@mozilla.org/xre/app-info;1"]
      .getService(Components.interfaces.nsIXULRuntime);
  var stats = {
      'firefoxVersion': xulAppInfo.name + ' ' + xulAppInfo.version
          + ' ('  + xulAppInfo.appBuildID + ')',
      'platform': xulRuntime.OS,

      // TODO: Ask AddonManager for version?  Async makes that difficult.
      'greasemonkeyVersion': gPrefMan.getValue('version'),
      'greasemonkeyEnabled': gPrefMan.getValue('enabled'),
      'globalExcludeCount': GM_util.getService().config.globalExcludes.length,

      'scripts': [],
      };

  var scripts = GM_util.getService().config.scripts;
  for (var i = 0, script = null; script = scripts[i]; i++) {
    var valueStats = new GM_ScriptStorageBack(script).getStats();

    var downloadUri = GM_util.uriFromUrl(script.downloadURL);
    var domain = null;
    try {
      // Ignore errors here; i.e. invalid/empty URLs.
      domain = gTldService.getBaseDomain(downloadUri);
    } catch (e) { }

    var sizes = [script.textContent.length];
    for (var j = 0, require = null; require = script.requires[j]; j++) {
      sizes[sizes.length] = require.textContent.length;
    }

    var scriptStat = {
        'enabled': script.enabled,
        'id': script.id,
        'installScheme': downloadUri.scheme,
        'installDomain': domain,
        'installTime': script.installDate.toISOString(),
        'modifiedTime': script.modifiedDate.toISOString(),
        'sizes': sizes,
        'userExcludeCount': script.userExcludes.length,
        'userMatchCount': script.userMatches.length,
        'userIncludeCount': script.userIncludes.length,
        'valueCount': valueStats.count,
        'valueSize': valueStats.size,
        };
    stats.scripts[stats.scripts.length] = scriptStat;
  }

  // TODO: Specify "ui" metrics, i.e. clicks on various things.

  return stats;
}


function promptUser() {
  if (gPrefMan.getValue('stats.prompted')) return;
  gPrefMan.setValue('stats.prompted', true);

  var win = GM_util.getBrowserWindow();
  var browser = win.gBrowser;

  var notificationBox = browser.getNotificationBox();
  var notification = notificationBox.appendNotification(
    gStringBundle.GetStringFromName('stats-prompt.msg'),
    "greasemonkey-stats-opt-in",
    "chrome://greasemonkey/skin/icon16.png",
    notificationBox.PRIORITY_INFO_MEDIUM,
    [{
      'label': gStringBundle.GetStringFromName('stats-prompt.readmore'),
      'accessKey': gStringBundle.GetStringFromName('stats-prompt.readmore.accesskey'),
      'popup': null,
      'callback': function() {
        browser.loadOneTab(
            'http://www.greasespot.net/2012/11/anonymous-statistic-gathering.html',
            {'inBackground': false});
      }
    },{
      'label': gStringBundle.GetStringFromName('stats-prompt.optin'),
      'accessKey': gStringBundle.GetStringFromName('stats-prompt.optin.accesskey'),
      'popup': null,
      'callback': function() {
        gPrefMan.setValue('stats.optedin', true);
        check();
      }
    }]
  );
  notification.persistence = -1;
}
