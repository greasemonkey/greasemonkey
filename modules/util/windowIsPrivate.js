Components.utils.import("resource://gre/modules/PrivateBrowsingUtils.jsm");

var EXPORTED_SYMBOLS = ["windowIsPrivate"];


function windowIsPrivate(aContentWin) {
  var isPrivate = true;
  if (PrivateBrowsingUtils.isContentWindowPrivate) {
    // Firefox >= 35
    isPrivate = PrivateBrowsingUtils.isContentWindowPrivate(aContentWin);
  } else {
    // Firefox <= 34; i.e. PaleMoon
    isPrivate = PrivateBrowsingUtils.isWindowPrivate(aContentWin);
  }

  return isPrivate;
}
