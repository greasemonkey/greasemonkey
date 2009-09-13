function GM_ScriptStorage(script) {
  this.prefMan = new GM_PrefManager(["scriptvals.",
                                     script.namespace,
                                     "/",
                                     script.name,
                                     "."].join(""));
}

GM_ScriptStorage.prototype.setValue = function(name, val) {
  if (2 !== arguments.length) {
    throw new Error("Second argument not specified: Value");
  }

  if (!GM_apiLeakCheck("GM_setValue")) {
    return;
  }

  this.prefMan.setValue(name, val);
};

GM_ScriptStorage.prototype.getValue = function(name, defVal) {
  if (!GM_apiLeakCheck("GM_getValue")) {
    return undefined;
  }

  return this.prefMan.getValue(name, defVal);
};

function GM_Resources(script){
  this.script = script;
}

GM_Resources.prototype.getResourceURL = function(name) {
  if (!GM_apiLeakCheck("GM_getResourceURL")) {
    return undefined;
  }

  return this.getDep_(name).dataContent;
};

GM_Resources.prototype.getResourceText = function(name) {
  if (!GM_apiLeakCheck("GM_getResourceText")) {
    return undefined;
  }

  return this.getDep_(name).textContent;
};

GM_Resources.prototype.getDep_ = function(name) {
  var resources = this.script.resources;
  for (var i = 0, resource; resource = resources[i]; i++) {
    if (resource.name == name) {
      return resource;
    }
  }

  throw new Error("No resource with name: " + name); // NOTE: Non localised string
};

function GM_ScriptLogger(script) {
  var namespace = script.namespace;

  if (namespace.substring(namespace.length - 1) != "/") {
    namespace += "/";
  }

  this.prefix = [namespace, script.name, ": "].join("");
}

GM_ScriptLogger.prototype.log = function(message) {
  GM_log(this.prefix + message, true);
};

GM_ScriptStorage.prototype.deleteValue = function(name) {
  if (!GM_apiLeakCheck("GM_deleteValue")) {
    return undefined;
  }

  return this.prefMan.remove(name);
};

GM_ScriptStorage.prototype.listValues = function() {
  if (!GM_apiLeakCheck("GM_listValues")) {
    return undefined;
  }

  return this.prefMan.listValues();
};

function GM_addStyle(doc, css) {
  var head = doc.getElementsByTagName("head")[0];
  if (head) {
    var style = doc.createElement("style");
    style.textContent = css;
    style.type = "text/css";
    head.appendChild(style);
  }
  return style;
}

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
