var EXPORTED_SYMBOLS = ['messageManagerForWin'];

var Ci = Components.interfaces;

function messageManagerForWin(aContentWin) {
  var rti = aContentWin.QueryInterface(Ci.nsIInterfaceRequestor)
      .getInterface(Ci.nsIWebNavigation)
      .QueryInterface(Ci.nsIDocShellTreeItem)
      .rootTreeItem;

  // dump(rti + "\n");
  // dump(rti.itemType + "\n");
  // dump(rti.name + "\n");

  return aContentWin.QueryInterface(Ci.nsIInterfaceRequestor)
      .getInterface(Ci.nsIWebNavigation)
      .QueryInterface(Ci.nsIDocShellTreeItem)
      .rootTreeItem
      .QueryInterface(Ci.nsIInterfaceRequestor)
      .getInterface(Ci.nsIContentFrameMessageManager);
};
