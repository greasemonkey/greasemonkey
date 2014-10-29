var EXPORTED_SYMBOLS = ['IPCScript'];

Components.utils.import("resource://greasemonkey/extractMeta.js");
Components.utils.import("resource://greasemonkey/util.js");

function IPCScript(aScript) {
  this.description = aScript.description;
  this.excludes = aScript.excludes;
  this.fileURL = aScript.fileURL;
  this.grants = aScript.grants;
  this.id = aScript.id;
  this.includes = aScript.includes;
  this.localized = aScript.localized;
  this.matches = aScript.matches.map(function(m) { return m.pattern });
  this.name = aScript.name;
  this.namespace = aScript.namespace;
  this.runAt = aScript.runAt;
  this.textContent = aScript.textContent;
  this.uuid = aScript.uuid;
  this.version = aScript.version;
  this.willUpdate = aScript.isRemoteUpdateAllowed();

  this.requires = aScript.requires.map(function(req) {
    return {
      'fileURL': req.fileURL,
      'textContent': req.textContent
    }
  });

  this.resources = aScript.resources.map(function(res) {
    return {
      'name': res.name,
      'mimetype': res.mimetype,
      'textContent': res.textContent
    };
  });
};

IPCScript.prototype.__defineGetter__('metaStr',
function IPCScript_getMetaStr() {
  if (!this._metaStr) {
    this._metaStr = extractMeta(this.textContent);
  }

  return this._metaStr;
});

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
    'version': "unknown", // TODO
    'scriptMetaStr': this.metaStr,
    'scriptSource': this.textContent,
    'scriptWillUpdate': this.willUpdate,
    'script': {
      'description': this.desciption,
      'excludes': this.excludes,
      // 'icon': ??? source URL?
      'includes': this.includes,
      'localizedDescription': this.localized.description,
      'localizedName': this.localized.name,
      'matches': this.matches,
      'name': this.name,
      'namespace': this.namespace,
      // 'requires': ??? source URL?
      'resources': resources,
      'run-at': this.runAt,
      'version': this.version
    }
  }
};
