var Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");

Cu.import("chrome://greasemonkey-modules/content/third-party/getChromeWinForContentWin.js");
Cu.import('chrome://greasemonkey-modules/content/prefmanager.js');
Cu.import("chrome://greasemonkey-modules/content/util.js");


var EXPORTED_SYMBOLS = [
    'GM_addStyle', 'GM_console', 'GM_Resources', 'GM_ScriptLogger'];

// \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ //

function GM_Resources(script) {
  this.script = script;
  this.stringBundle = Components
    .classes["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .createBundle("chrome://greasemonkey/locale/greasemonkey.properties");
}

GM_Resources.prototype.getResourceURL = function(aScript, name) {
  return ['greasemonkey-script:', aScript.uuid, '/', name].join('');
};


GM_Resources.prototype.getResourceText = function(name) {
  var dep = this._getDep(name)
  if(dep.textContent !== undefined)
    return dep.textContent;
  // lazy resources in IPC scripts
  return GM_util.fileXHR(dep.url, "text/plain");
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
  this.consoleService.logStringMessage((this.prefix + '\n' + message).replace(/\0/g, ''));
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
