/*
=== START LICENSE ===

Copyright 2004-2005 Aaron Boodman

Contributors:
Jeremy Dunck, Nikolas Coukouma, Matthew Gray.

Permission is hereby granted, free of charge, to any person obtaining a copy 
of this software and associated documentation files (the "Software"), to deal 
in the Software without restriction, including without limitation the rights 
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell 
copies of the Software, and to permit persons to whom the Software is 
furnished to do so, subject to the following conditions:

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

=== END LICENSE ===

The above copyright notice and this permission notice shall be included in all 
copies or substantial portions of the Software.
*/

function GM_MenuCommander(contentWindow) {
  GM_log("> GM_MenuCommander")
  this.menu = document.getElementById("userscript-commands");
  this.keyset = document.getElementById("mainKeyset");
  this.menuPopup = this.menu.firstChild;
  this.contentWindow = contentWindow;
  
  this.menuItems = [];
  this.keys = [];
  this.attached = false;
  GM_log("< GM_MenuCommander")
}

GM_MenuCommander.prototype.registerMenuCommand = 
function(commandName, commandFunc, accelKey, accelModifiers, accessKey) {
  GM_log("> GM_MenuCommander.registerMenuCommand");
  
  // Most of the time, and IFRAME creating a menu command would just be wierd,
  // because there'd end up being lots of duplicate commands. We should add 
  // IFRAME support for this, but for now, iframe scripts which *really* want 
  // to register commands can always add a hook for themselves in the top 
  // frame, and call it from the iframe.

  if (this.contentWindow == this.contentWindow.top) {
    GM_log('accelKey: ' + accelKey);
    GM_log('modifiers: ' + accelModifiers); 
    GM_log('accessKey: ' + accessKey); 

    var menuItem = this.createMenuItem(commandName, commandFunc, accessKey);
    this.menuItems.push(menuItem);  
  
    if (accelKey) {
      var key = this.createKey(commandFunc, accelKey, accelModifiers, menuItem);
      this.keys.push(key);
    }

    // if this menucommander is for the current document, we should add the 
    // elements immediately. otherwise it will be added in attach()
    if (this.attached) {
      this.menuPopup.appendChild(menuItem);
    
      if (accelKey) {
        this.keyset.appendChild(key);
      }
    
      this.setDisabled(false);
    }
  }
  
  GM_log("< GM_MenuCommmander.registerMenuCommand")
}

GM_MenuCommander.prototype.attach = function() {
  GM_log("> GM_MenuCommander.attach")

  for (var i = 0; i < this.menuItems.length; i++) {
    this.menuPopup.appendChild(this.menuItems[i]);
  }
  
  for (var i = 0; i < this.keys.length; i++) {
    this.keyset.appendChild(this.keys[i]);
  }

  this.setDisabled(this.menuItems.length == 0);
  this.attached = true;

  GM_log("< GM_MenuCommander.attach")
}

GM_MenuCommander.prototype.detach = function() {
  GM_log("> GM_MenuCommander.detach")
  GM_log("* this.menuPopup: " + this.menuPopup);

  for (var i = 0; i < this.menuItems.length; i++) {
    this.menuPopup.removeChild(this.menuItems[i]);
  }
  
  for (var i = 0; i < this.keys.length; i++) {
    this.keyset.removeChild(this.keys[i]);
  }

  this.setDisabled(true);
  this.attached = false;

  GM_log("< GM_MenuCommander.detach")
}

//TODO: restructure accel/access validation to be at register time.  
//Should throw when called, not when building menu.  
//This has side effect of one script's bad reg affecting another script's.
GM_MenuCommander.prototype.createMenuItem = 
function(commandName, commandFunc, accessKey) {
  GM_log("> GM_MenuCommander.createMenuItem");
  
  var menuItem = document.createElement("menuitem");
  menuItem._commandFunc = commandFunc;
  menuItem.setAttribute("label", commandName);
  menuItem.setAttribute("oncommand", "this._commandFunc()");

  GM_log("< GM_MenuCommander.createMenuItem");
  return menuItem;
}

GM_MenuCommander.prototype.createKey = 
function(commandFunc, accelKey, modifiers, menuItem) {
  GM_log("> GM_MenuCommander.createKey");
  
  var key = document.createElement("key");

  if ((typeof accelKey) == "number") {
    GM_log("keycode: " + accelKey);
    key.setAttribute("keycode", accelKey);
  } else if ((typeof accelKey) == "string" && accelKey.length == 1) {
    GM_log("key: " + accelKey);
    key.setAttribute("key", accelKey);
  } else {
    throw "key must be a numerical keycode or a single character";
  }

  GM_log("modifiers: " + modifiers);
  key.setAttribute("modifiers", modifiers);

  // hack, because listen("oncommand", commandFunc) does not work!
  // this is ok because .detach() gets called when the document is unloaded
  // and this key is destroyed
  key._commandFunc = commandFunc;
  key.setAttribute("oncommand", "this._commandFunc()");
  
  var id = "userscript-command-" + this.keys.length;
  key.setAttribute("id", id);
  menuItem.setAttribute("key", id);
  
  GM_log("< GM_MenuCommander.createKey");
  return key;  
}

GM_MenuCommander.prototype.setDisabled = function(disabled) {
  var menu = this.menu;
  var marker = menu.nextSibling;
  var parent = menu.parentNode;
  
  menu.setAttribute("disabled", disabled);

  parent.removeChild(menu);
  parent.insertBefore(menu, marker);
}