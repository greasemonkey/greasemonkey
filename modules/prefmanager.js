var EXPORTED_SYMBOLS = ['GM_PrefManager', 'GM_prefRoot'];

var gStringBundle = Components
    .classes["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .createBundle("chrome://greasemonkey/locale/greasemonkey.properties");

/**
 * Simple API on top of preferences for greasemonkey.
 * Construct an instance by passing the startPoint of a preferences subtree.
 * "greasemonkey." prefix is assumed.
 */
function GM_PrefManager(startPoint) {
  startPoint = "extensions.greasemonkey." + (startPoint || "");

  this.pref = Components.classes["@mozilla.org/preferences-service;1"]
     .getService(Components.interfaces.nsIPrefService)
     .getBranch(startPoint);

  this.observers = new Map();
};

GM_PrefManager.prototype.MIN_INT_32 = -0x80000000;
GM_PrefManager.prototype.MAX_INT_32 = 0x7FFFFFFF;
GM_PrefManager.prototype.nsISupportsString = Components.interfaces
    .nsISupportsString;

/**
 * whether a preference exists
 */
GM_PrefManager.prototype.exists = function(prefName) {
  return this.pref.getPrefType(prefName) != 0;
};

/**
 * enumerate preferences
 */
GM_PrefManager.prototype.listValues = function() {
  return this.pref.getChildList("", {});
};

/**
 * returns the named preference, or defaultValue if it does not exist
 */
GM_PrefManager.prototype.getValue = function(prefName, defaultValue) {
  var prefType = this.pref.getPrefType(prefName);

  // underlying preferences object throws an exception if pref doesn't exist
  if (prefType == this.pref.PREF_INVALID) {
    return defaultValue;
  }

  try {
    switch (prefType) {
      case this.pref.PREF_STRING:
        return this.pref.getComplexValue(prefName, this.nsISupportsString).data;
      case this.pref.PREF_BOOL:
        return this.pref.getBoolPref(prefName);
      case this.pref.PREF_INT:
        return this.pref.getIntPref(prefName);
    }
  } catch(e) {
    return defaultValue != undefined ? defaultValue : null;
  }
  return null;
};

/**
 * sets the named preference to the specified value. values must be strings,
 * booleans, or integers.
 */
GM_PrefManager.prototype.setValue = function(prefName, value) {
  var prefType = typeof(value);
  var goodType = false;

  switch (prefType) {
    case "string":
    case "boolean":
      goodType = true;
      break;
    case "number":
      if (value % 1 == 0 &&
          value >= this.MIN_INT_32 &&
          value <= this.MAX_INT_32) {
        goodType = true;
      }
      break;
  }

  if (!goodType) {
    throw new Error(
        gStringBundle.GetStringFromName('error.args.getValue'));
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
          .createInstance(this.nsISupportsString);
      str.data = value;
      this.pref.setComplexValue(prefName, this.nsISupportsString, str);
      break;
    case "boolean":
      this.pref.setBoolPref(prefName, value);
      break;
    case "number":
      this.pref.setIntPref(prefName, Math.floor(value));
      break;
  }
};

/**
 * deletes the named preference or subtree
 */
GM_PrefManager.prototype.remove = function(prefName) {
  this.pref.deleteBranch(prefName);
};

/**
 * call a function whenever the named preference subtree changes
 */
GM_PrefManager.prototype.watch = function(prefName, watcher) {
  // construct an observer
  var observer = {
    observe: function(subject, topic, prefName) { watcher(prefName); }
  };

  // store the observer in case we need to remove it later
  this.observers.set(watcher, observer);

  // http://bugzil.la/1374847
  let _pref = null;
  try {
    _pref = this.pref.QueryInterface(
        Components.interfaces.nsIPrefBranchInternal);
  } catch (e) {
    _pref = this.pref.QueryInterface(Components.interfaces.nsIPrefBranch);
  }
  _pref.addObserver(prefName, observer, false);
};

/**
 * stop watching
 */
GM_PrefManager.prototype.unwatch = function(prefName, watcher) {
  var obs = this.observers.get(watcher);
  if (obs) {
    this.observers.delete(watcher);
    // http://bugzil.la/1374847
    let _pref = null;
    try {
      _pref = this.pref.QueryInterface(
          Components.interfaces.nsIPrefBranchInternal);
    } catch (e) {
      _pref = this.pref.QueryInterface(Components.interfaces.nsIPrefBranch);
    }
    _pref.removeObserver(prefName, obs);
  }
};

var GM_prefRoot = new GM_PrefManager();
