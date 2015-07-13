Components.utils.import('chrome://greasemonkey-modules/content/util.js');

var EXPORTED_SYMBOLS = ['windowId'];

function windowId(win, which) {
  try {
    // Do not operate on chrome windows.
    win.QueryInterface(Components.interfaces.nsIDOMChromeWindow);
    return null;
  } catch (e) {
    // We want this to fail.  Catch is no-op.
  }

  try {
    // Dunno why this is necessary, but sometimes we get non-chrome windows
    // whose locations we cannot access.
    var href = win.location.href;
    if (!GM_util.isGreasemonkeyable(href)) return null;
  } catch (e) {
    return null;
  }

  var domWindowUtils = win
      .QueryInterface(Components.interfaces.nsIInterfaceRequestor)
      .getInterface(Components.interfaces.nsIDOMWindowUtils);
  var windowId;
  try {
    if ('outer' == which) {
      windowId = domWindowUtils.outerWindowID;
    } else if (!which || 'inner' == which) {
      windowId = domWindowUtils.currentInnerWindowID;
    }
  } catch (e) { }
  if ('undefined' == typeof windowId) {
    // Firefox <4.0 does not provide this, use the document instead.
    // (Document is a property of the window, and should let us dig into the
    // "inner window" rather than always getting the same "outer window", due
    // to bfcache.  https://developer.mozilla.org/en/Inner_and_outer_windows )
    return win.document;
  }
  return windowId;
}
