const EXPORTED_SYMBOLS = ['findMessageManager'];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;

function findMessageManager(aContext) {
  // With e10s off, context is a <browser> with a direct reference to
  // the docshell loaded therein.
  var docShell = aContext && aContext.docShell;

  if (!docShell) {
    // But with e10s on, context is a content window and we have to work hard
    // to find the docshell, from which we can find the message manager.
    docShell = aContext
        .QueryInterface(Ci.nsIInterfaceRequestor)
        .getInterface(Ci.nsIWebNavigation)
        .QueryInterface(Ci.nsIDocShellTreeItem).rootTreeItem;
  }

  return docShell
      .QueryInterface(Ci.nsIInterfaceRequestor)
      .getInterface(Ci.nsIContentFrameMessageManager);
};
