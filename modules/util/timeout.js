const EXPORTED_SYMBOLS = ['timeout'];

function timeout(aCallback, aDelay) {
  // Create the timer object.
  var timer = Components.classes["@mozilla.org/timer;1"]
      .createInstance(Components.interfaces.nsITimer);

  // The timer object may be garbage collected before it fires, so we need to
  // keep a reference to it alive (https://bugzil.la/647998).
  // However, simply creating a closure over the timer object without using it
  // may not be enough, as the timer might get optimized out of the closure
  // scope (https://bugzil.la/640629#c9). To work around this, the timer object
  // is explicitly stored as a property of the observer.
  var observer = {
    'observe': function() {
      delete observer.timer;
      aCallback();
    },
    'timer': timer
  };

  timer.init(observer, aDelay, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
}
