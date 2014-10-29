var Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");

Cu.import("resource://greasemonkey/third-party/getChromeWinForContentWin.js");
Cu.import('resource://greasemonkey/prefmanager.js');
Cu.import("resource://greasemonkey/util.js");


var EXPORTED_SYMBOLS = [
    'GM_addStyle', 'GM_console', 'GM_openInTab', 'GM_Resources',
    'GM_ScriptLogger', 'GM_ScriptStorage', 'GM_ScriptStoragePrefs'];


function GM_ScriptStorage(script) {
  this._db = null;
  this._script = script;
  this.stringBundle = Components
    .classes["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .createBundle("chrome://greasemonkey/locale/greasemonkey.properties");
}


GM_ScriptStorage.prototype.__defineGetter__('dbFile',
function GM_ScriptStorage_getDbFile() {
  var file = GM_util.scriptDir();
  file.append(this._script.baseDirName + '.db');
  return file;
});


GM_ScriptStorage.prototype.__defineGetter__('db',
function GM_ScriptStorage_getDb() {
  if (null == this._db) {
    this._db = Services.storage.openDatabase(this.dbFile);

    // The auto_vacuum pragma has to be set before the table is created.
    this._db.executeSimpleSQL('PRAGMA auto_vacuum = INCREMENTAL;');
    this._db.executeSimpleSQL('PRAGMA incremental_vacuum(10);');
    this._db.executeSimpleSQL('PRAGMA journal_mode = WAL;');
    this._db.executeSimpleSQL('PRAGMA wal_autocheckpoint = 10;');

    this._db.executeSimpleSQL(
        'CREATE TABLE IF NOT EXISTS scriptvals ('
        + 'name TEXT PRIMARY KEY NOT NULL, '
        + 'value TEXT '
        + ')'
        );

    // Run vacuum once manually to switch to the correct auto_vacuum mode for
    // databases that were created with incorrect auto_vacuum. See #1879.
    this._db.executeSimpleSQL('VACUUM;');
  }
  return this._db;
});


GM_ScriptStorage.prototype.setValue = function(name, val) {
  if (2 !== arguments.length) {
    throw new Error(this.stringBundle.GetStringFromName('error.args.setValue'));
  }

  var stmt = this.db.createStatement(
      'INSERT OR REPLACE INTO scriptvals (name, value) VALUES (:name, :value)');
  try {
    stmt.params.name = name;
    stmt.params.value = JSON.stringify(val);
    stmt.execute();
  } finally {
    stmt.reset();
  }

  this._script.changed('val-set', name);
};


GM_ScriptStorage.prototype.getValue = function(name, defVal) {
  var value = null;
  var stmt = this.db.createStatement(
      'SELECT value FROM scriptvals WHERE name = :name');
  try {
    stmt.params.name = name;
    while (stmt.step()) {
      value = stmt.row.value;
    }
  } catch (e) {
    dump('getValue err: ' + uneval(e) + '\n');
  } finally {
    stmt.reset();
  }

  if (value == null) return defVal;
  try {
    return JSON.parse(value);
  } catch (e) {
    dump('JSON parse error? ' + uneval(e) + '\n');
    return defVal;
  }
};


GM_ScriptStorage.prototype.deleteValue = function(name) {
  var stmt = this.db.createStatement(
      'DELETE FROM scriptvals WHERE name = :name');
  try {
    stmt.params.name = name;
    stmt.execute();
  } finally {
    stmt.reset();
  }

  this._script.changed('val-del', name);
};


GM_ScriptStorage.prototype.listValues = function() {
  var valueNames = [];

  var stmt = this.db.createStatement('SELECT name FROM scriptvals');
  try {
    while (stmt.executeStep()) {
      valueNames.push(stmt.row.name);
    }
  } finally {
    stmt.reset();
  }

  // See #1637.
  var vals = Array.prototype.slice.call(valueNames);
  vals.__exposedProps__ = {'length': 'r'};
  return vals;
};


GM_ScriptStorage.prototype.getStats = function() {
  var stats = {
      count: undefined,
      size: undefined,
      };
  var stmt = this.db.createStatement(
      'SELECT COUNT(0) AS count, SUM(LENGTH(value)) AS size FROM scriptvals');
  try {
    while (stmt.step()) {
      stats.count = stmt.row.count;
      stats.size = stmt.row.size || 0;
    }
  } catch (e) {
    dump('getStats err: ' + uneval(e) + '\n');
  } finally {
    stmt.reset();
  }

  return stats;
};


// \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ //


// TODO: Remove this when we're confident enough users have updated from
// prefs-base to Storage based script values.
function GM_ScriptStoragePrefs(script) {
  this._script = script;
  this.prefMan = new GM_PrefManager(script.prefroot);
  this.stringBundle = Components
    .classes["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .createBundle("chrome://greasemonkey/locale/greasemonkey.properties");
}

GM_ScriptStoragePrefs.prototype.setValue = function(name, val) {
  if (2 !== arguments.length) {
    throw new Error(this.stringBundle.GetStringFromName('error.args.setValue'));
  }

  this.prefMan.setValue(name, val);
  this._script.changed('val-set', name);
};

GM_ScriptStoragePrefs.prototype.getValue = function(name, defVal) {
  return this.prefMan.getValue(name, defVal);
};

GM_ScriptStoragePrefs.prototype.deleteValue = function(name) {
  return this.prefMan.remove(name);
  this._script.changed('val-del', name);
};

GM_ScriptStoragePrefs.prototype.listValues = function() {
  // See #1637.
  var vals = Array.prototype.slice.call(this.prefMan.listValues());
  vals.__exposedProps__ = {'length': 'r'};
  return vals;
};

// \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ //

function GM_Resources(script){
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
  message = message.replace(/\0/g, '');
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

// \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ //

function GM_openInTab(aScriptRunner, aUrl, aLoadInBackground) {
  if ('undefined' == typeof aLoadInBackground) aLoadInBackground = null;

  // Resolve URL relative to the location of the content window.
  var baseUri = Services.io.newURI(aScriptRunner.window.location.href, null, null);
  var uri = Services.io.newURI(aUrl, null, baseUri);

  return aScriptRunner.openInTab(uri.spec, !!aLoadInBackground);
};
