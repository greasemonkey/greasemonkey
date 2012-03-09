Components.utils.import('resource://greasemonkey/util.js');

const EXPORTED_SYMBOLS = ['timeout'];

function timeout(aCallback, aDelay) {
  var extraArgs = Array.prototype.slice.call(arguments, 2);
  var curriedCallback = GM_util.hitch(null, aCallback, extraArgs);

  Components.classes["@mozilla.org/timer;1"]
      .createInstance(Components.interfaces.nsITimer)
      .initWithCallback(
          {'notify': curriedCallback}, aDelay,
          Components.interfaces.nsITimer.TYPE_ONE_SHOT);
}
