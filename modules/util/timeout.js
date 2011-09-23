Components.utils.import('resource://greasemonkey/util.js');

const EXPORTED_SYMBOLS = ['timeout'];

function timeout(aDelay, aCallback) {
  var timer = Components.classes["@mozilla.org/timer;1"]
      .createInstance(Components.interfaces.nsITimer);
  timer.initWithCallback(
      {'notify': aCallback}, aDelay,
      Components.interfaces.nsITimer.TYPE_ONE_SHOT);
}
