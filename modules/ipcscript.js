var EXPORTED_SYMBOLS = ['IPCScript'];

Components.utils.import("chrome://greasemonkey-modules/content/util.js");
Components.utils.import('chrome://greasemonkey-modules/content/abstractScript.js');


// IPCScript class


function IPCScript(aScript, addonVersion) {
  this.addonVersion = addonVersion;
  this.enabled = aScript.enabled;
  this.needsUninstall = aScript.needsUninstall;
  this.pendingExec = {};
  this.pendingExec.length = aScript.pendingExec.length || 0
  this.description = aScript.description;
  this.excludes = aScript.excludes;
  this.userExcludes = aScript.userExcludes;
  this.fileURL = aScript.fileURL;
  this.grants = aScript.grants;
  this.id = aScript.id;
  this.includes = aScript.includes;
  this.userIncludes = aScript.userIncludes;
  this.localized = aScript.localized;
  this.matches = aScript.matches.map(function(m) {
    return m.pattern;
  });
  this.userMatches = aScript.userMatches.map(function(m) {
    return m.pattern;
  });
  this.name = aScript.name;
  this.namespace = aScript.namespace;
  this.noframes = aScript.noframes;
  this.runAt = aScript.runAt;
  this.uuid = aScript.uuid;
  this.version = aScript.version;
  this.willUpdate = aScript.isRemoteUpdateAllowed();

  this.requires = aScript.requires.map(function(req) {
    return {
      'fileURL': req.fileURL
    };
  });

  this.resources = aScript.resources.map(function(res) {
    return {
      'name': res.name,
      'mimetype': res.mimetype,
      'url': GM_util.getUriFromFile(res.file).spec
    };
  });
};

//inheritance magic
IPCScript.prototype = Object.create(AbstractScript.prototype, {
  constructor: {
    value: IPCScript 
  }
});


// initialize module-scoped stuff, after prototype override

var scripts = [];

const cpmm = Components.classes["@mozilla.org/childprocessmessagemanager;1"]
    .getService(Components.interfaces.nsISyncMessageSender);

function objectToScript(obj) {
  var script = Object.create(IPCScript.prototype);
  Object.keys(obj).forEach(function(k) {
    script[k] = obj[k];
  });
  Object.freeze(script);
  return script;
}

function updateData(data) {
  if (!data) return;
  var newScripts = data.scripts.map(objectToScript);
  Object.freeze(newScripts);
  scripts = newScripts;
  IPCScript.prototype.globalExcludes = data.globalExcludes;
}

if (cpmm.initialProcessData) {
  updateData(cpmm.initialProcessData["greasemonkey:scripts-update"]);
} else {
  // support FF < 41
  var results = cpmm.sendSyncMessage("greasemonkey:scripts-update");
  updateData(results[0]);
}

cpmm.addMessageListener("greasemonkey:scripts-update", function(message) {
  updateData(message.data);
});



// static method

IPCScript.scriptsForUrl = function(url, when, windowId) {
    return scripts.filter(function(script) {
      try {
        return GM_util.scriptMatchesUrlAndRuns(script, url, when);
      } catch (e) {
        console.log(e);
        GM_util.logError(e, false, e.fileName, e.lineNumber);
        // See #1692; Prevent failures like that from being so severe.
        return false;
      }
   });
}

// instance methods


IPCScript.prototype.info = function() {
  var resources = {};
  for (var i = 0, r = null; r = this.resources[i]; i++) {
    resources[r.name] = {
        'name': r.name,
        'mimetype': r.mimetype,
        };
  }

  return {
    'uuid': this.uuid,
    'version': this.addonVersion,
    'scriptWillUpdate': this.willUpdate,
    'script': {
      'description': this.description,
      'excludes': this.excludes,
      // 'icon': ??? source URL?
      'includes': this.includes,
      'localizedDescription': this.localized.description,
      'localizedName': this.localized.name,
      'matches': this.matches,
      'name': this.name,
      'namespace': this.namespace,
      'noframes': this.noframes,
      // 'requires': ??? source URL?
      'resources': resources,
      'run-at': this.runAt,
      'version': this.version
    }
  };
};