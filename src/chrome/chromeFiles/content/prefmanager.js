

var GM_prefRoot = new GM_PrefManager();

/**
 * Simple API on top of preferences for greasemonkey.
 * Construct an instance by passing the startPoint of a preferences subtree.
 * "greasemonkey." prefix is assumed.
 */
function GM_PrefManager(startPoint) {
  if (!startPoint) {
    startPoint = "";
  }

  startPoint = "greasemonkey." + startPoint;

  var pref = Components.classes["@mozilla.org/preferences-service;1"].
                getService(Components.interfaces.nsIPrefService).
                getBranch(startPoint);

  var observers = {};
  const nsISupportsString = Components.interfaces.nsISupportsString;

  /**
   * whether a preference exists
   */
  this.exists = function(prefName) {
    return pref.getPrefType(prefName) != 0;
  }

  /**
   * returns the named preference, or defaultValue if it does not exist
   */
  this.getValue = function(prefName, defaultValue) {
    var prefType = pref.getPrefType(prefName);

    // underlying preferences object throws an exception if pref doesn't exist
    if (prefType == pref.PREF_INVALID) {
      return defaultValue;
    }

    try {
      switch (prefType) {
        case pref.PREF_STRING:
          return pref.getComplexValue(prefName, nsISupportsString).data;
        case pref.PREF_BOOL:
          return pref.getBoolPref(prefName);
        case pref.PREF_INT:
          return pref.getIntPref(prefName);
      }
    } catch(ex) {
      return defaultValue != undefined ? defaultValue : null;
    }
    return null;
  }

  /**
   * sets the named preference to the specified value. values must be strings,
   * booleans, or integers.
   */
  this.setValue = function(prefName, value) {
    var prefType = typeof(value);

    switch (prefType) {
      case "string":
      case "boolean":
        break;
      case "number":
        if (value % 1 != 0) {
          throw new Error("Cannot set preference to non integral number");
        }
        break;
      default:
        throw new Error("Cannot set preference with datatype: " + prefType);
    }

    // underlying preferences object throws an exception if new pref has a
    // different type than old one. i think we should not do this, so delete
    // old pref first if this is the case.
    if (this.exists(prefName) && prefType != typeof(this.getValue(prefName))) {
      this.remove(prefName);
    }

    // set new value using correct method
    switch (prefType) {
      case "string":
        var str = Components.classes["@mozilla.org/supports-string;1"]
                            .createInstance(nsISupportsString);
        str.data = value;
        pref.setComplexValue(prefName, nsISupportsString, str);
        break;
      case "boolean":
        pref.setBoolPref(prefName, value);
        break;
      case "number":
        pref.setIntPref(prefName, Math.floor(value));
        break;
    }
  }

  /**
   * deletes the named preference or subtree
   */
  this.remove = function(prefName) {
    pref.deleteBranch(prefName);
  }

  /**
   * call a function whenever the named preference subtree changes
   */
  this.watch = function(prefName, watcher) {
    // construct an observer
    var observer = {
      observe:function(subject, topic, prefName) {
        watcher(prefName);
      }
    };

    // store the observer in case we need to remove it later
    observers[watcher] = observer;

    pref.QueryInterface(Components.interfaces.nsIPrefBranchInternal).
      addObserver(prefName, observer, false);
  }

  /**
   * stop watching
   */
  this.unwatch = function(prefName, watcher) {
    if (observers[watcher]) {
      pref.QueryInterface(Components.interfaces.nsIPrefBranchInternal).
        removeObserver(prefName, observers[watcher]);
    }
  }
}