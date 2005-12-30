function GM_MenuCommander(doc) {
  this.doc = doc;
  this.menuItemData = [];

  bindMethods(this);
}

GM_MenuCommander.__defineGetter__("modifierFuncs", function() {
  if (!this.modifierFuncs_) {
    this.modifierFuncs_ = {
      "ctrl": function(e) { return e.ctrlKey },
      "alt": function(e) { return e.altKey },
      "shift": function(e) { return e.shiftKey } };
    
    if (Cc["@mozilla.org/appshell/appShellService;1"]
          .getService(Ci.nsIAppShellService).hiddenDOMWindow
          .navigator.platform == "MacOS") {
      this.modifierFuncs_["accel"] = function(e) { return e.metaKey };
    } else {
      this.modifierFuncs_["accel"] = this.modifierFuncs_["ctrl"];
    }
  }

  return this.modifierFuncs_;
});

GM_MenuCommander.prototype.registerMenuCommand = 
function(commandName, commandFunc, accelKey, accelModifiers, accessKey) {
  var keyCode;

  if (isString(accelKey) && accelKey.length == "1") {
    keyCode = accelKey.toUpperCase().charCodeAt(0);
  } else if (isNumber(accelKey)) {
    keyCode = accelKey;
  }

  accelModifiers = accelModifiers ? accelModifiers.split(" ") : [];

  for (var i = 0, mod; mod = accelModifiers[i]; i++) {
    accelModifiers[i] = mod.toLowerCase();
  }

  this.menuItemData.push({commandName: commandName,
                          commandFunc: commandFunc,
                          accelKey: accelKey,
                          accelModifiers: accelModifiers,
                          accessKey: accessKey,
                          keyCode: keyCode});

  if (this.menuItemData.length == 1) {
    this.doc.addEventListener("keypress", this.handleKeyPress, true, false);    
  }
}

GM_MenuCommander.prototype.handleKeyPress = function(e) {
  for (var i = 0, details; details = this.menuItemData[i]; i++) {
    if (this.checkModifiers(e, details.accelModifiers)) {
      log([e.keyCode, e.charCode, details.keyCode].join(","));
      if (e.keyCode === details.keyCode || 
           e.charCode === details.keyCode ||
          (e.charCode - 32) === details.keyCode) {
        details.commandFunc();
      }
    }
  }
}

GM_MenuCommander.prototype.checkModifiers = function(e, modifiers) {
  for (var i = 0, mod; mod = modifiers[i]; i++) {
    var fn = GM_MenuCommander.modifierFuncs[mod];

    if (!fn || !fn(e)) {
      return false;
    }
  }

  return true;
}

GM_MenuCommander.prototype.initMenuItems = function(menuPopup) {
  // kill all existing <menuitem>s
  while (menuPopup.firstChild) {
    menuPopup.removeChild(menuPopup.firstChild);
  }

  // add a <menuitem> for each menuItemData element. 
  forEach(this.menuItemData, partial(this.addMenuItem, menuPopup));

  // disable/enabled menu as necessary
  menuPopup.parentNode.setAttribute("disabled", this.menuItemData.length == 0);
}

GM_MenuCommander.prototype.addMenuItem = function(parent, details) {
  var menuItem = parent.ownerDocument.createElement("menuitem");

  menuItem._commandFunc = details.commandFunc;
  menuItem.setAttribute("label", details.commandName);
  menuItem.setAttribute("oncommand", "this._commandFunc()");

  if (isDef(details.accessKey)) {
    if (isString(details.accessKey) && details.accessKey.length == 1) {
      menuItem.setAttribute("accesskey", details.accessKey);
    } else {
      throw "accessKey must be a single character";
    }
  }

  // TODO! - There must be some code somewhere in mozilla which knows how to do
  // this correctly and i18n/pref aware. Find and reuse it.
  var accelText = [];

  if (isString(details.modifiers) && details.modifiers.length > 0) {
    accelText = accelText.concat(details.modifiers.split(" "));
  }

  if (isDef(details.accelKey)) {
    accelText.push(details.accelkey);
  }

  if (accelText.length) {
    menuItem.setAttribute("acceltext", accelText.join(" "));
  }

  parent.appendChild(menuItem);
}

loggify(GM_MenuCommander.prototype, "GM_MenuCommander");
