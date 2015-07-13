Components.utils.import('chrome://greasemonkey-modules/content/util.js');

var EXPORTED_SYMBOLS = ['windowIsClosed'];

var Cu = Components.utils;

/*
Accessing windows that are closed can be dangerous after
http://bugzil.la/695480 .  This routine takes care of being careful to not
trigger any of those broken edge cases.
*/
function windowIsClosed(aWin) {
  try {
    // If isDeadWrapper (Firefox 15+ only) tells us the window is dead.
    if (Cu.isDeadWrapper && Cu.isDeadWrapper(aWin)) {
      return true;
    }

    // If we can access the .closed property and it is true, or there is any
    // problem accessing that property.
    try {
      if (aWin.closed) return true;
    } catch (e) {
      return true;
    }
  } catch (e) {
    Cu.reportError(e);
    // Failsafe.  In case of any failure, destroy the command to avoid leaks.
    return true;
  }
  return false;
}
