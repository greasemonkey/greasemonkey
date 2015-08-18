var EXPORTED_SYMBOLS = ['IPCScript'];

Components.utils.import("chrome://greasemonkey-modules/content/util.js");

function IPCScript(aScript, addonVersion) {
  this.addonVersion = addonVersion;
  this.description = aScript.description;
  this.excludes = aScript.excludes;
  this.fileURL = aScript.fileURL;
  this.grants = aScript.grants;
  this.id = aScript.id;
  this.includes = aScript.includes;
  this.localized = aScript.localized;
  this.matches = aScript.matches.map(function(m) { return m.pattern; });
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