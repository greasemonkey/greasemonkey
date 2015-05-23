const EXPORTED_SYMBOLS = ['GM_util'];

const Cu = Components.utils;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

/*
This "util" module separates all the methods into individual files, and lazily
imports them automatically, the first time each method is called.  Simply import
this top-level module:

Components.utils.import("resource://greasemonkey/util.js");

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
XPCOMUtils.defineLazyModuleGetter(GM_util, 'alert', 'resource://greasemonkey/util/alert.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'anonWrap', 'resource://greasemonkey/util/anonWrap.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'compareFirefoxVersion', 'resource://greasemonkey/util/compareFirefoxVersion.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'emptyEl', 'resource://greasemonkey/util/emptyEl.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'enqueueRemoveFile', 'resource://greasemonkey/util/enqueueRemoveFile.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'findMessageManager', 'resource://greasemonkey/util/findMessageManager.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'getBestLocaleMatch', 'resource://greasemonkey/util/getBestLocaleMatch.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'getBinaryContents', 'resource://greasemonkey/util/getBinaryContents.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'getBrowserWindow', 'resource://greasemonkey/util/getBrowserWindow.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'getContents', 'resource://greasemonkey/util/getContents.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'getEditor', 'resource://greasemonkey/util/getEditor.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'getEnabled', 'resource://greasemonkey/util/getEnabled.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'getPreferredLocale', 'resource://greasemonkey/util/getPreferredLocale.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'getScriptSource', 'resource://greasemonkey/util/getScriptSource.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'getService', 'resource://greasemonkey/util/getService.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'getTempDir', 'resource://greasemonkey/util/getTempDir.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'getTempFile', 'resource://greasemonkey/util/getTempFile.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'getUriFromFile', 'resource://greasemonkey/util/getUriFromFile.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'hitch', 'resource://greasemonkey/util/hitch.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'inArray', 'resource://greasemonkey/util/inArray.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'installScriptFromSource', 'resource://greasemonkey/util/installScriptFromSource.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'isGreasemonkeyable', 'resource://greasemonkey/util/isGreasemonkeyable.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'logError', 'resource://greasemonkey/util/logError.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'memoize', 'resource://greasemonkey/util/memoize.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'newUserScript', 'resource://greasemonkey/util/newUserScript.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'openInEditor', 'resource://greasemonkey/util/openInEditor.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'parseMetaLine', 'resource://greasemonkey/util/parseMetaLine.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'scriptDir', 'resource://greasemonkey/util/scriptDir.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'scriptMatchesUrlAndRuns', 'resource://greasemonkey/util/scriptMatchesUrlAndRuns.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'setEditor', 'resource://greasemonkey/util/setEditor.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'setEnabled', 'resource://greasemonkey/util/setEnabled.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'sha1', 'resource://greasemonkey/util/sha1.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'showInstallDialog', 'resource://greasemonkey/util/showInstallDialog.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'sniffGrants', 'resource://greasemonkey/util/sniffGrants.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'timeout', 'resource://greasemonkey/util/timeout.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'uriFromUrl', 'resource://greasemonkey/util/uriFromUrl.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'uuid', 'resource://greasemonkey/util/uuid.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'windowId', 'resource://greasemonkey/util/windowId.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'windowIdForEvent', 'resource://greasemonkey/util/windowIdForEvent.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'windowIsClosed', 'resource://greasemonkey/util/windowIsClosed.js');
XPCOMUtils.defineLazyModuleGetter(GM_util, 'writeToFile', 'resource://greasemonkey/util/writeToFile.js');
