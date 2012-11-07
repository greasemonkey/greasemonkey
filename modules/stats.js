/*
This module implements the reporting side of the pseudo-anonymous usage
statistic gathering first described at:
https://github.com/greasemonkey/greasemonkey/issues/1651

It does not export anything.  It only sets an interval and periodically does
the work to send data to the server.
*/
var EXPORTED_SYMBOLS = [];

Components.utils.import('resource://services-common/utils.js');
Components.utils.import('resource://greasemonkey/parseScript.js');
Components.utils.import('resource://greasemonkey/prefmanager.js');
Components.utils.import('resource://greasemonkey/util.js');

var gPrefMan = new GM_PrefManager();
var gStringBundle = Components
    .classes["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .createBundle("chrome://greasemonkey/locale/greasemonkey.properties");

// Check once, soon.
GM_util.timeout(check, 1000 * 10) // ms = 10 seconds
// And forever, as long as the browser stays open.
GM_util.timeout(
    check, 1000 * 60 * 60,  // ms = 1 hour
    Components.interfaces.nsITimer.TYPE_REPEATING_PRECISE_CAN_SKIP)


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
    var valueCount = 0;
    var valueSize = 0;
    var scriptPrefMan = new GM_PrefManager(script.prefroot);
    var scriptPrefNames = scriptPrefMan.listValues();
    for (var j = 0, prefName = null; prefName = scriptPrefNames[j]; j++) {
      valueCount++;
      // Approximate size as JSON representation, that's a likely way they
      // would really be used.
      valueSize += prefName.length + JSON.stringify(
          scriptPrefMan.getValue(prefName)).length;
    }

    var explicitGrants = [];
    var imperatives = [];
    var metaLines = extractMeta(script.textContent).match(gLineSplitRegexp);
    for (var j = 0, metaLine = null; metaLine = metaLines[j]; j++) {
      var m = gMetaLineRegexp.exec(metaLine);
      if (!m) continue;
      imperatives[imperatives.length] = m[1];
      if ('grant' == m[1]) {
        explicitGrants[explicitGrants.length] = m[2];
      }
    }

    var scriptStat = {
        'enabled': script.enabled,
        'explicitGrants': explicitGrants,
        'id': script.id,
        'imperatives': imperatives,
        'implicitGrants': script.grants,
        'installScheme': '',
        'installDomain': '',
        'installTime': script.installDate.toISOString(),
        'modifiedTime': script.modifiedDate.toISOString(),
        'userExcludeCount': script.userExcludes.length,
        'userIncludeCount': script.userIncludes.length,
        'valueCount': valueCount,
        'valueSize': valueSize,
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
  notificationBox.appendNotification(
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
}
