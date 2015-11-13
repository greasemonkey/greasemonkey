var EXPORTED_SYMBOLS = ['IPCScript'];

Components.utils.import("chrome://greasemonkey-modules/content/util.js");
Components.utils.import('chrome://greasemonkey-modules/content/abstractScript.js');


function IPCScript(aScript, addonVersion) {
  this.addonVersion = addonVersion;
  this.description = aScript.description;
  this.enabled = aScript.enabled;
  this.excludes = aScript.excludes;
  this.fileURL = aScript.fileURL;
  this.grants = aScript.grants;
  this.id = aScript.id;
  this.includes = aScript.includes;
  this.localized = aScript.localized;
  this.name = aScript.name;
  this.namespace = aScript.namespace;
  this.needsUninstall = aScript.needsUninstall;
  this.noframes = aScript.noframes;
  this.pendingExec = {};
  this.pendingExec.length = aScript.pendingExec.length || 0;
  this.runAt = aScript.runAt;
  this.userExcludes = aScript.userExcludes;
  this.userIncludes = aScript.userIncludes;
  this.uuid = aScript.uuid;
  this.version = aScript.version;
  this.willUpdate = aScript.isRemoteUpdateAllowed();

  this.matches = aScript.matches.map(function(m) {
    return m.pattern;
  });
  this.userMatches = aScript.userMatches.map(function(m) {
    return m.pattern;
  });

  this.requires = aScript.requires.map(function(req) {
    return {
      'fileURL': req.fileURL
    };
  });

  this.resources = aScript.resources.map(function(res) {
    return {
      'name': res.name,
      'mimetype': res.mimetype,
      'file_url': GM_util.getUriFromFile(res.file).spec,
      'gm_url': ['greasemonkey-script:', aScript.uuid, '/', res.name].join(''),
    };
  });
};


IPCScript.prototype = Object.create(AbstractScript.prototype, {
  constructor: {
    value: IPCScript
  }
});


IPCScript.scriptsForUrl = function(url, when, windowId) {
  var result = scripts.filter(function(script) {
    try {
      return GM_util.scriptMatchesUrlAndRuns(script, url, when);
    } catch (e) {
      // See #1692; Prevent failures like that from being so severe.
      GM_util.logError(e, false, e.fileName, e.lineNumber);
      return false;
    }
  });
  return result;
};


IPCScript.prototype.info = function() {
  var resources = {};
  for (var i = 0, r = null; r = this.resources[i]; i++) {
    resources[r.name] = {
      'name': r.name,
      'mimetype': r.mimetype,
      'url': r.gm_url,
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


var scripts = [];

var cpmm = Components.classes["@mozilla.org/childprocessmessagemanager;1"]
    .getService(Components.interfaces.nsISyncMessageSender);


function objectToScript(obj) {
  var script = Object.create(IPCScript.prototype);
  Object.keys(obj).forEach(function(k) {
    script[k] = obj[k];
  });
  Object.freeze(script);
  return script;
}

IPCScript.getByUuid = function (id) {
  return scripts.find(function(e) {
    return e.uuid == id
  })  
}

function updateData(data) {
  if (!data) return;
  var newScripts = data.scripts.map(objectToScript);
  Object.freeze(newScripts);
  scripts = newScripts;
  Object.defineProperty(IPCScript.prototype, "globalExcludes", {
    get: function () { return data.globalExcludes; },
    configurable: true,
    enumerable: true
  });
}


if (cpmm.initialProcessData) {
  updateData(cpmm.initialProcessData["greasemonkey:scripts-update"]);
} else {
  // Support FF < 41.
  var results = cpmm.sendSyncMessage("greasemonkey:scripts-update");
  updateData(results[0]);
}

cpmm.addMessageListener("greasemonkey:scripts-update", function(aMessage) {
  updateData(aMessage.data);
});
