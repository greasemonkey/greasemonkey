Components.utils.import('resource://greasemonkey/util.js');

const EXPORTED_SYMBOLS = ['timeout'];

function timeout(aCallback, aDelay, aType) {
  var type = aType;
  if ('undefineld' == typeof type) {
    type = Components.interfaces.nsITimer.TYPE_ONE_SHOT;
  }

  // Create the timer object.
  var timer = Components.classes["@mozilla.org/timer;1"]
      .createInstance(Components.interfaces.nsITimer);
  // Init the callback, with a closure reference to the timer, so that it is
  // not garbage collected before it fires.
  timer.init(
      {
        'observe': function() {
          timer;  // Here's the reference that keeps the timer alive!
          aCallback();
        }
      },
      aDelay, type);
}
