var EXPORTED_SYMBOLS = ['messageManagerForWin'];

var Ci = Components.interfaces;

function messageManagerForWin(aContentWin) {
  try {
    // This crazy incantation works only when E10S is ENabled.
    return aContentWin.QueryInterface(Ci.nsIInterfaceRequestor)
        .getInterface(Ci.nsIWebNavigation)
        .QueryInterface(Ci.nsIDocShellTreeItem)
        .rootTreeItem
        .QueryInterface(Ci.nsIInterfaceRequestor)
        .getInterface(Ci.nsIContentFrameMessageManager);
  } catch (e) {
    // While this one works when E10S is DISabled.
    try {
      return aContentWin.QueryInterface(Ci.nsIInterfaceRequestor)
          .getInterface(Ci.nsIWebNavigation)
          .QueryInterface(Ci.nsIDocShell)
          .QueryInterface(Ci.nsIInterfaceRequestor)
          .getInterface(Ci.nsIContentFrameMessageManager);
    } catch (e) {
      dump('Could not get message manager round 2:\n'+e+'\n\n');
      return null;
    }
  }
};
