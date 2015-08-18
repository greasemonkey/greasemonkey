var EXPORTED_SYMBOLS = ['GM_util'];

var Cu = Components.utils;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

/*
This "util" module separates all the methods into individual files, and lazily
imports them automatically, the first time each method is called.  Simply import
this top-level module:

Components.utils.import("chrome://greasemonkey-modules/content/util.js");

Then call one of its methods (e.g.):

GM_util.log('foo');

The module 'util/foo.js' will be imported, and the 'foo' function it defines
will be called for you.  In the future that method will exist directly.  Thus
all modules inside 'util/' should define and export exactly one function, with
the same name as the file.  All other contents are privates to that method's
module.
*/
var GM_util = {};

// Do not edit below this line.  Use `util.sh` to auto-populate.
XPCOMUtils.defineLazyModuleGetter(GM_util, 'alert', 'chrome://greasemonkey-modules/content/util/alert.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'compareFirefoxVersion', 'chrome://greasemonkey-modules/content/util/compareFirefoxVersion.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'emptyEl', 'chrome://greasemonkey-modules/content/util/emptyEl.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'enqueueRemoveFile', 'chrome://greasemonkey-modules/content/util/enqueueRemoveFile.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'fileXHR', 'chrome://greasemonkey-modules/content/util/fileXHR.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'findMessageManager', 'chrome://greasemonkey-modules/content/util/findMessageManager.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'getBestLocaleMatch', 'chrome://greasemonkey-modules/content/util/getBestLocaleMatch.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'getBinaryContents', 'chrome://greasemonkey-modules/content/util/getBinaryContents.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'getBrowserWindow', 'chrome://greasemonkey-modules/content/util/getBrowserWindow.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'getContents', 'chrome://greasemonkey-modules/content/util/getContents.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'getEditor', 'chrome://greasemonkey-modules/content/util/getEditor.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'getEnabled', 'chrome://greasemonkey-modules/content/util/getEnabled.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'getPreferredLocale', 'chrome://greasemonkey-modules/content/util/getPreferredLocale.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'getScriptSource', 'chrome://greasemonkey-modules/content/util/getScriptSource.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'getService', 'chrome://greasemonkey-modules/content/util/getService.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'getTempDir', 'chrome://greasemonkey-modules/content/util/getTempDir.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'getTempFile', 'chrome://greasemonkey-modules/content/util/getTempFile.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'getUriFromFile', 'chrome://greasemonkey-modules/content/util/getUriFromFile.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'hitch', 'chrome://greasemonkey-modules/content/util/hitch.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'inArray', 'chrome://greasemonkey-modules/content/util/inArray.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'installScriptFromSource', 'chrome://greasemonkey-modules/content/util/installScriptFromSource.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'isGreasemonkeyable', 'chrome://greasemonkey-modules/content/util/isGreasemonkeyable.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'logError', 'chrome://greasemonkey-modules/content/util/logError.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'memoize', 'chrome://greasemonkey-modules/content/util/memoize.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'newUserScript', 'chrome://greasemonkey-modules/content/util/newUserScript.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'openInEditor', 'chrome://greasemonkey-modules/content/util/openInEditor.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'parseMetaLine', 'chrome://greasemonkey-modules/content/util/parseMetaLine.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'scriptDir', 'chrome://greasemonkey-modules/content/util/scriptDir.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'scriptMatchesUrlAndRuns', 'chrome://greasemonkey-modules/content/util/scriptMatchesUrlAndRuns.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'setEditor', 'chrome://greasemonkey-modules/content/util/setEditor.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'setEnabled', 'chrome://greasemonkey-modules/content/util/setEnabled.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'sha1', 'chrome://greasemonkey-modules/content/util/sha1.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'showInstallDialog', 'chrome://greasemonkey-modules/content/util/showInstallDialog.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'sniffGrants', 'chrome://greasemonkey-modules/content/util/sniffGrants.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'timeout', 'chrome://greasemonkey-modules/content/util/timeout.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'uriFromUrl', 'chrome://greasemonkey-modules/content/util/uriFromUrl.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'uuid', 'chrome://greasemonkey-modules/content/util/uuid.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'windowIdForEvent', 'chrome://greasemonkey-modules/content/util/windowIdForEvent.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'windowId', 'chrome://greasemonkey-modules/content/util/windowId.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'windowIsClosed', 'chrome://greasemonkey-modules/content/util/windowIsClosed.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'writeToFile', 'chrome://greasemonkey-modules/content/util/writeToFile.js');
