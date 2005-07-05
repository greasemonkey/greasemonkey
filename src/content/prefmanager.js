/*
Copyright 2004-2005 Aaron Boodman

Contributors:
Jeremy Dunck, Nikolas Coukouma, Matthew Gray.

Greasemonkey is licensed under the MIT License:
http://www.opensource.org/licenses/mit-license.php

Permission is hereby granted, free of charge, to any person obtaining a copy 
of this software and associated documentation files (the "Software"), to deal 
in the Software without restriction, including without limitation the rights 
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell 
copies of the Software, and to permit persons to whom the Software is 
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all 
copies or substantial portions of the Software.

Note that this license applies only to the Greasemonkey extension source 
files, not to the user scripts which it runs. User scripts are licensed 
separately by their authors.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE 
SOFTWARE.
*/

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
    
    switch (prefType) {
      case pref.PREF_STRING:
        return pref.getCharPref(prefName);
      case pref.PREF_BOOL:
        return pref.getBoolPref(prefName);
      case pref.PREF_INT:
        return pref.getIntPref(prefName);
    }
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
        pref.setCharPref(prefName, value);
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