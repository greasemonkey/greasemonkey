Components.utils.import("resource://gre/modules/PrivateBrowsingUtils.jsm");

var EXPORTED_SYMBOLS = ["windowIsPrivate"];


function windowIsPrivate(aContentWin) {
  // i.e. the Private Browsing autoStart pref:
  // "browser.privatebrowsing.autostart"
  return PrivateBrowsingUtils.isContentWindowPrivate(aContentWin);
}
