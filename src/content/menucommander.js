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

function GM_MenuCommander() {
  GM_log("> GM_MenuCommander")
  this.menu = document.getElementById("userscript-commands");
  this.keyset = document.getElementById("mainKeyset");
  
  this.commandData = [];
  this.activeKeys = [];
  this.attached = false;
  this.menuPopup = null;
  GM_log("< GM_MenuCommander")
}

GM_MenuCommander.prototype.registerMenuCommand = 
function(commandName, commandFunc, accel, access) {
  GM_log("> GM_MenuCommander.registerMenuCommand")

  this.commandData.push({commandName:commandName,
                         commandFunc:commandFunc,
                         accel:accel,
                         access:access});

  if (typeof accel == 'object') {
    GM_log('accel: ' + uneval(accel)); 
  }                         

  GM_log('access: ' + access); 
  
  if (this.menuPopup != null) {
    this.createMenuItem(this.commandData.length - 1);
  }
  
  GM_log("< GM_MenuCommmander.registerMenuCommand")
}

GM_MenuCommander.prototype.attach = function() {
  GM_log("> GM_MenuCommander.attach")

  this.menuPopup = document.createElement("menupopup");
  this.menu.appendChild(this.menuPopup);
  // start disabled -- each createMenuItem call will re-enable
  // this.menu.disabled = true;
  
  GM_log("commandData.length: " + this.commandData.length);
  for (var i = 0; i < this.commandData.length; i++) {
    this.createMenuItem(i);
  }
  
  this.attached = true;

  GM_log("< GM_MenuCommander.attach")
}

GM_MenuCommander.prototype.detach = function() {
  GM_log("> GM_MenuCommander.detach")
  GM_log("* this.menuPopup: " + this.menuPopup);
  
  // this.menu.disabled = true;
  this.menu.removeChild(this.menuPopup);
  this.menuPopup = null;

  GM_log("unregistering " + this.activeKeys.length + " keys");    
  for (var i = 0; i < this.activeKeys.length; i++) {
    this.keyset.removeChild(this.activeKeys[i]);
  }

  this.activeKeys = [];
  this.attached = false;

  GM_log("< GM_MenuCommander.detach")
}

//TODO: restructure accel/access validation to be at register time.  
//Should throw when called, not when building menu.  
//This has side effect of one script's bad reg affecting another script's.
GM_MenuCommander.prototype.createMenuItem = function(commandIndex) {
  GM_log("> GM_MenuCommander.createMenuItem");
  
  var modText = [];
  var commandData = this.commandData[commandIndex];
  var accel = commandData.accel;
  
  var menuItem = document.createElement("menuitem");
  menuItem._commandFunc = commandData.commandFunc;
  menuItem.setAttribute("label", commandData.commandName);
  menuItem.setAttribute("oncommand", "this._commandFunc()");

  this.menuPopup.appendChild(menuItem);
  // this.menu.disabled = false;

  if (accel) {
    var key = document.createElement("key");
    var validModifiers = ["accel", "control", "meta", "shift", "alt"];

    if ((typeof accel.key) == "number") {
      GM_log("keycode: " + accel.key);
      key.setAttribute("keycode", accel.key);
    } else if ((typeof accel.key) == "string" && accel.key.length == 1) {
      GM_log("key: " + accel.key);
      key.setAttribute("key", accel.key);
    } else {
      throw "key must be a numerical keycode or a single character";
    }

    for (var i = 0; i < validModifiers.length; i++) {
      if (accel[validModifiers[i]]) {
        modText.push(validModifiers[i]);
      }
    }

    GM_log("modifiers: " + modText.join(" "));
    key.setAttribute("modifiers", modText.join(" "));

    if (commandData.access) {
      menuItem.setAttribute("accesskey", commandData.access);
    }
    
    // hack, because listen("oncommand", commandFunc) does not work!
    // this is ok because .detach() gets called when the document is unloaded
    // and this key is destroyed
    key._commandFunc = commandData.commandFunc;
    key.setAttribute("oncommand", "this._commandFunc()");

    this.keyset.appendChild(key);
    this.activeKeys.push(key);
  }
  
  GM_log("< GM_MenuCommander.createMenuItem");
}