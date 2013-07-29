Components.utils.import('resource://greasemonkey/prefmanager.js');

function GM_ScriptStorage(script) {
  this.prefMan = new GM_PrefManager(script.prefroot);
  this.stringBundle = Components
    .classes["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .createBundle("chrome://greasemonkey/locale/greasemonkey.properties");
}

GM_ScriptStorage.prototype.setValue = function(name, val) {
  if (2 !== arguments.length) {
    throw new Error(this.stringBundle.GetStringFromName('error.args.setValue'));
  }

  if (!GM_util.apiLeakCheck("GM_setValue")) {
    return;
  }

  this.prefMan.setValue(name, val);
};

GM_ScriptStorage.prototype.getValue = function(name, defVal) {
  if (!GM_util.apiLeakCheck("GM_getValue")) {
    return undefined;
  }

  return this.prefMan.getValue(name, defVal);
};

GM_ScriptStorage.prototype.deleteValue = function(name) {
  if (!GM_util.apiLeakCheck("GM_deleteValue")) {
    return undefined;
  }

  return this.prefMan.remove(name);
};

GM_ScriptStorage.prototype.listValues = function() {
  if (!GM_util.apiLeakCheck("GM_listValues")) {
    return undefined;
  }

  // See #1637.
  var vals = Array.prototype.slice.call(this.prefMan.listValues());
  vals.__exposedProps__ = {'length': 'r'};
  return vals;
};

// \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ //

function GM_Resources(script){
  this.script = script;
}

GM_Resources.prototype.getResourceURL = function(aScript, name) {
  if (!GM_util.apiLeakCheck("GM_getResourceURL")) {
    return undefined;
  }

  return ['greasemonkey-script:', aScript.uuid, '/', name].join('');
};

GM_Resources.prototype.getResourceText = function(name) {
  if (!GM_util.apiLeakCheck("GM_getResourceText")) {
    return undefined;
  }

  return this._getDep(name).textContent;
};

GM_Resources.prototype._getDep = function(name) {
  var resources = this.script.resources;
  for (var i = 0, resource; resource = resources[i]; i++) {
    if (resource.name == name) {
      return resource;
    }
  }

  throw new Error(
      this.stringBundle.GetStringFromName('error.missingResource')
          .replace('%1', name)
      );
};

// \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ //

function GM_ScriptLogger(script) {
  var namespace = script.namespace;

  if (namespace.substring(namespace.length - 1) != "/") {
    namespace += "/";
  }

  this.prefix = [namespace, script.name, ": "].join("");
}

GM_ScriptLogger.prototype.consoleService = Components
    .classes["@mozilla.org/consoleservice;1"]
    .getService(Components.interfaces.nsIConsoleService);

GM_ScriptLogger.prototype.log = function(message) {
  // https://developer.mozilla.org/en-US/docs/XPCOM_Interface_Reference/nsIConsoleService#logStringMessage() - wstring / wide string
  var message = message.replace(/\0|\u0000/mg, '');
  this.consoleService.logStringMessage(this.prefix + '\n' + message);
};

// \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ //

function GM_addStyle(doc, css) {
  var head = doc.getElementsByTagName("head")[0];
  if (head) {
    var style = doc.createElement("style");
    style.textContent = css;
    style.type = "text/css";
    head.appendChild(style);
    return style;
  }
  return null;
}

// \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ //

function GM_console(script) {
  // based on http://www.getfirebug.com/firebug/firebugx.js
  var names = [
    "debug", "warn", "error", "info", "assert", "dir", "dirxml",
    "group", "groupEnd", "time", "timeEnd", "count", "trace", "profile",
    "profileEnd"
  ];

  for (var i=0, name; name=names[i]; i++) {
    this[name] = function() {};
  }

  // Important to use this private variable so that user scripts can't make
  // this call something else by redefining <this> or <logger>.
  var logger = new GM_ScriptLogger(script);
  this.log = function() {
    logger.log(
      Array.prototype.slice.apply(arguments).join("\n")
    );
  };
}

GM_console.prototype.log = function() {
};
