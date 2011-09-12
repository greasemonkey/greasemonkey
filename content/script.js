Components.utils.import('resource://greasemonkey/constants.js');
Components.utils.import('resource://greasemonkey/prefmanager.js');
Components.utils.import('resource://greasemonkey/third-party/MatchPattern.js');
Components.utils.import('resource://greasemonkey/third-party/convert2RegExp.js');
Components.utils.import('resource://greasemonkey/util.js');

function Script(configNode) {
  this._observers = [];

  this._downloadURL = null;
  this._updateURL = null;
  this._tempFile = null;
  this._basedir = null;
  this._filename = null;
  this._modified = null;
  this._dependhash = null;

  this._name = null;
  this._namespace = "";
  this._id = null;
  this._prefroot = null;
  this._description = null;
  this._version = null;
  this._icon = new ScriptIcon(this);
  this._enabled = true;
  this.needsUninstall = false;
  this._includes = [];
  this._userIncludes = [];
  this._excludes = [];
  this._userExcludes = [];
  this._matches = [];
  this._requires = [];
  this._resources = [];
  this._unwrap = false;
  this._dependFail = false;
  this._runAt = null;
  this._rawMeta = null;
  this._lastUpdateCheck = null;
  this.updateAvailable = null;
  this._updateVersion = null;
  this.pendingExec = [];

  if (configNode) this._loadFromConfigNode(configNode);
}

Script.prototype.matchesURL = function(url) {
  function testClude(glob) {
    // Do not run in about:blank unless _specifically_ requested.  See #1298
    if (-1 !== url.indexOf('about:blank')
        && -1 == glob.indexOf('about:blank')
    ) {
      return false;
    }

    return GM_convert2RegExp(glob).test(url);
  }
  function testMatch(matchPattern) {
    return matchPattern.doMatch(url);
  }

  // Flat deny if URL is not greaseable, or matches global excludes.
  if (!GM_util.isGreasemonkeyable(url)) return false;
  if (GM_util.getService().config._globalExcludes.some(testClude)) return false;

  // Allow based on user cludes.
  if (this._userExcludes.some(testClude)) return false;
  if (this._userIncludes.some(testClude)) return true;

  // Finally allow based on script cludes and matches.
  if (this.excludes.some(testClude)) return false;
  return (this._includes.some(testClude) || this._matches.some(testMatch));
};

Script.prototype._changed = function(event, data) {
  GM_util.getService().config._changed(this, event, data);
};

Script.prototype.__defineGetter__('modifiedDate',
function Script_getModifiedDate() { return new Date(parseInt(this._modified)); });

Script.prototype.__defineGetter__('name',
function Script_getName() { return this._name; });

Script.prototype.__defineGetter__('namespace',
function Script_getNamespace() { return this._namespace; });

Script.prototype.__defineGetter__('id',
function Script_getId() {
  if (!this._id) this._id = this._namespace + "/" + this._name;
  return this._id;
});

Script.prototype.__defineGetter__('prefroot',
function Script_getPrefroot() {
  if (!this._prefroot) this._prefroot = ["scriptvals.", this.id, "."].join("");
  return this._prefroot;
});

Script.prototype.__defineGetter__('description',
function Script_getDescription() { return this._description; });

Script.prototype.__defineGetter__('version',
function Script_getVersion() { return this._version; });

Script.prototype.__defineGetter__('icon',
function Script_getIcon() { return this._icon; });

Script.prototype.__defineGetter__('enabled',
function Script_getEnabled() { return this._enabled; });

Script.prototype.__defineSetter__('enabled',
function Script_setEnabled(enabled) {
  this._enabled = enabled;
  this._changed("edit-enabled", enabled);
});

Script.prototype.__defineGetter__('includes',
function Script_getIncludes() { return this._includes.concat(); });
Script.prototype.__defineSetter__('includes',
function Script_setIncludes(includes) { this._includes = includes.concat(); });

Script.prototype.__defineGetter__('userIncludes',
function Script_getUserIncludes() { return this._userIncludes.concat(); });
Script.prototype.__defineSetter__('userIncludes',
function Script_setUserIncludes(includes) { this._userIncludes = includes.concat(); });

Script.prototype.__defineGetter__('excludes',
function Script_getExcludes() { return this._excludes.concat(); });
Script.prototype.__defineSetter__('excludes',
function Script_SetExcludes(excludes) { this._excludes = excludes.concat(); });

Script.prototype.__defineGetter__('userExcludes',
function Script_getUserExcludes() { return this._userExcludes.concat(); });
Script.prototype.__defineSetter__('userExcludes',
function Script_setUserExcludes(excludes) { this._userExcludes = excludes.concat(); });

Script.prototype.__defineGetter__('matches',
function Script_getMatches() { return this._matches.concat(); });

Script.prototype.__defineGetter__('requires',
function Script_getRequires() { return this._requires.concat(); });

Script.prototype.__defineGetter__('resources',
function Script_getResources() { return this._resources.concat(); });

Script.prototype.__defineGetter__('runAt',
function Script_getRunAt() { return this._runAt; });

Script.prototype.__defineGetter__('unwrap',
function Script_getUnwrap() { return this._unwrap; });

Script.prototype.__defineGetter__('filename',
function Script_getFilename() { return this._filename; });

Script.prototype.__defineGetter__('file',
function Script_getFile() {
  var file = this._basedirFile;
  file.append(this._filename);
  return file;
});

Script.prototype.__defineGetter__('updateURL',
function Script_getUpdateURL() { return this._updateURL; });
Script.prototype.__defineSetter__('updateURL',
function Script_setUpdateURL(url) {
  if (!url && !this._downloadURL) return null;

  if (!url) url = this._downloadURL;

  // US.o gets special treatment for being so large
  var usoURL = url.match(/^(https?:\/\/userscripts.org\/[^?]*\.user\.js)\??/);
  if (usoURL) {
    this._updateURL = usoURL[1].replace(/\.user\.js$/,".meta.js");
  } else {
    this._updateURL = url;
  }
});

Script.prototype.__defineGetter__('updateIsSecure',
function Script_getUpdateIsSecure() {
  if (!this._downloadURL) return null;

  return /^https/.test(this._downloadURL);
});

Script.prototype.__defineGetter__('_basedirFile',
function Script_getBasedirFile() {
  var file = GM_util.scriptDir();
  file.append(this._basedir);
  try {
    // Can fail if this path does not exist.
    file.normalize();
  } catch (e) {
    // no-op
  }
  return file;
});

Script.prototype.__defineGetter__('fileURL',
function Script_getFileURL() { return GM_util.getUriFromFile(this.file).spec; });

Script.prototype.__defineGetter__('textContent',
function Script_getTextContent() { return GM_util.getContents(this.file); });

Script.prototype._initFileName = function(name, useExt) {
  var ext = "";
  name = name.toLowerCase();

  var dotIndex = name.lastIndexOf(".");
  if (dotIndex > 0 && useExt) {
    ext = name.substring(dotIndex + 1);
    name = name.substring(0, dotIndex);
  }

  name = name.replace(/\s+/g, "_").replace(/[^-_A-Z0-9]+/gi, "");
  ext = ext.replace(/\s+/g, "_").replace(/[^-_A-Z0-9]+/gi, "");

  // If no Latin characters found - use default
  if (!name) name = "gm_script";

  // 24 is a totally arbitrary max length
  if (name.length > 24) name = name.substring(0, 24);

  if (ext) name += "." + ext;

  return name;
};

Script.prototype._loadFromConfigNode = function(node) {
  this._filename = node.getAttribute("filename");
  this._basedir = node.getAttribute("basedir") || ".";
  this._downloadURL = node.getAttribute("installurl") || null;
  this.updateURL = node.getAttribute("updateurl") || null;

  if (!this.fileExists(this._basedirFile)) return;
  if (!this.fileExists(this.file)) return;

  if (!node.hasAttribute("modified")
      || !node.hasAttribute("dependhash")
      || !node.hasAttribute("version")
  ) {
    var parsedScript = GM_util.getService().config.parse(
        this.textContent, GM_util.uriFromUrl(this._downloadURL), !!this);

    this._modified = this.file.lastModifiedTime;
    this._dependhash = GM_util.sha1(parsedScript._rawMeta);
    this._version = parsedScript._version;

    GM_util.getService().config._changed(this, "modified", null);
  } else {
    this._modified = node.getAttribute("modified");
    this._dependhash = node.getAttribute("dependhash");
    this._version = node.getAttribute("version");
  }

  if (!node.getAttribute("updateAvailable")
      || !node.getAttribute("lastUpdateCheck")
  ) {
    this.updateAvailable = false;
    this._lastUpdateCheck = this._modified;

    GM_util.getService().config._changed(this, "modified", null);
  } else {
    this.updateAvailable = node.getAttribute("updateAvailable") == 'true';
    this._updateVersion = node.getAttribute("updateVersion") || null;
    this._lastUpdateCheck = node.getAttribute("lastUpdateCheck");
  }

  for (var i = 0, childNode; childNode = node.childNodes[i]; i++) {
    switch (childNode.nodeName) {
    case "Include":
      this._includes.push(childNode.textContent);
      break;
    case "Exclude":
      this._excludes.push(childNode.textContent);
      break;
    case "UserInclude":
      this._userIncludes.push(childNode.textContent);
      break;
    case "UserExclude":
      this._userExcludes.push(childNode.textContent);
      break;
    case "Match":
      this._matches.push(new MatchPattern(childNode.textContent));
      break;
    case "Require":
      var scriptRequire = new ScriptRequire(this);
      scriptRequire._filename = childNode.getAttribute("filename");
      this._requires.push(scriptRequire);
      break;
    case "Resource":
      var scriptResource = new ScriptResource(this);
      scriptResource._name = childNode.getAttribute("name");
      scriptResource._filename = childNode.getAttribute("filename");
      scriptResource._mimetype = childNode.getAttribute("mimetype");
      scriptResource._charset = childNode.getAttribute("charset");
      this._resources.push(scriptResource);
      break;
    case "Unwrap":
      this._unwrap = true;
      break;
    }
  }

  this._name = node.getAttribute("name");
  this._namespace = node.getAttribute("namespace");
  this._description = node.getAttribute("description");
  this._runAt = node.getAttribute("runAt") || "document-end"; // legacy default
  this.icon.fileURL = node.getAttribute("icon");
  this._enabled = node.getAttribute("enabled") == true.toString();
};

Script.prototype.toConfigNode = function(doc) {
  var scriptNode = doc.createElement("Script");

  function addNode(name, content) {
    var node = doc.createElement(name);
    node.appendChild(doc.createTextNode(content));
    scriptNode.appendChild(doc.createTextNode("\n\t\t"));
    scriptNode.appendChild(node);
  }

  function addArrayNodes(aName, aArray) {
    for (var i = 0, val = null; val = aArray[i]; i++) {
      addNode(aName, val);
    }
  }

  addArrayNodes('Include', this._includes);
  addArrayNodes('UserInclude', this._userIncludes);
  addArrayNodes('Exclude', this._excludes);
  addArrayNodes('UserExclude', this._userExcludes);

  for (var j = 0; j < this._matches.length; j++) {
    addNode('Match', this._matches[j].pattern);
  }

  for (var j = 0; j < this._requires.length; j++) {
    var req = this._requires[j];
    var resourceNode = doc.createElement("Require");

    resourceNode.setAttribute("filename", req._filename);

    scriptNode.appendChild(doc.createTextNode("\n\t\t"));
    scriptNode.appendChild(resourceNode);
  }

  for (var j = 0; j < this._resources.length; j++) {
    var imp = this._resources[j];
    var resourceNode = doc.createElement("Resource");

    resourceNode.setAttribute("name", imp._name);
    resourceNode.setAttribute("filename", imp._filename);
    resourceNode.setAttribute("mimetype", imp._mimetype);
    if (imp._charset) {
      resourceNode.setAttribute("charset", imp._charset);
    }

    scriptNode.appendChild(doc.createTextNode("\n\t\t"));
    scriptNode.appendChild(resourceNode);
  }

  if (this._unwrap) {
    scriptNode.appendChild(doc.createTextNode("\n\t\t"));
    scriptNode.appendChild(doc.createElement("Unwrap"));
  }

  scriptNode.appendChild(doc.createTextNode("\n\t"));

  scriptNode.setAttribute("filename", this._filename);
  scriptNode.setAttribute("name", this._name);
  scriptNode.setAttribute("namespace", this._namespace);
  scriptNode.setAttribute("description", this._description);
  scriptNode.setAttribute("version", this._version);
  scriptNode.setAttribute("enabled", this._enabled);
  scriptNode.setAttribute("runAt", this._runAt);
  scriptNode.setAttribute("basedir", this._basedir);
  scriptNode.setAttribute("modified", this._modified);
  scriptNode.setAttribute("dependhash", this._dependhash);
  scriptNode.setAttribute("updateAvailable", this.updateAvailable);
  scriptNode.setAttribute("lastUpdateCheck", this._lastUpdateCheck);

  if (this._downloadURL) {
    scriptNode.setAttribute("installurl", this._downloadURL);
  }

  if (this._updateURL) {
    scriptNode.setAttribute("updateurl", this._updateURL);
  }

  if (this._updateVersion) {
    scriptNode.setAttribute("updateVersion", this._updateVersion);
  }

  if (this.icon.filename) {
    scriptNode.setAttribute("icon", this.icon.filename);
  }

  return scriptNode;
};

Script.prototype._initFile = function(tempFile) {
  var name = this._initFileName(this._name, false);
  this._basedir = name;

  var nsIFile = Components.interfaces.nsIFile;
  var file = GM_util.scriptDir();
  file.append(name);
  file.createUnique(nsIFile.DIRECTORY_TYPE, GM_constants.directoryMask);
  this._basedir = file.leafName;

  file.append(name + ".user.js");
  file.createUnique(nsIFile.NORMAL_FILE_TYPE, GM_constants.fileMask);
  this._filename = file.leafName;

  file.remove(true);
  tempFile.moveTo(file.parent, file.leafName);
};


Script.prototype.__defineGetter__('urlToDownload',
function Script_getUrlToDownload() { return this._downloadURL; });

Script.prototype.setDownloadedFile = function(file) { this._tempFile = file; };

Script.prototype.__defineGetter__('previewURL',
function Script_getPreviewURL() {
  return Components.classes["@mozilla.org/network/io-service;1"]
      .getService(Components.interfaces.nsIIOService)
      .newFileURI(this._tempFile).spec;
});

Script.prototype.isModified = function() {
  if (!this.fileExists(this.file)) return false;
  if (this._modified != this.file.lastModifiedTime) {
    this._modified = this.file.lastModifiedTime;
    return true;
  }
  return false;
};

Script.prototype.updateFromNewScript = function(newScript, safeWin, chromeWin) {
  // if the @name and @namespace have changed
  // make sure they don't conflict with another installed script
  if (newScript.id != this.id) {
    if (!GM_util.getService().config.installIsUpdate(newScript)) {
      // Migrate preferences.
      if (this.prefroot != newScript.prefroot) {
        var storageOld = new GM_ScriptStorage(this);
        var storageNew = new GM_ScriptStorage(newScript);

        var names = storageOld.listValues();
        for (var i = 0, name = null; name = names[i]; i++) {
          storageNew.setValue(name, storageOld.getValue(name));
          storageOld.deleteValue(name);
        }
      }

      // Empty cached values.
      this._id = null;
      this._prefroot = null;

      this._name = newScript._name;
      this._namespace = newScript._namespace;
    } else {
      // Notify the user of the conflict
      alert('Error: Another script with @name: "' + newScript._name +
            '" and @namespace: "' + newScript._namespace +
            '" is already installed.\nThese values must be unique.');
    }
  }

  // Copy new values.
  //  NOTE: User 'cludes are _not_ copied!  They should remain as-is.
  this._includes = newScript._includes;
  this._excludes = newScript._excludes;
  this._matches = newScript._matches;
  this._description = newScript._description;
  this._runAt = newScript._runAt;
  this._unwrap = newScript._unwrap;
  this._version = newScript._version;
  this._downloadURL = newScript._downloadURL;
  this._updateURL = newScript._updateURL;

  var dependhash = GM_util.sha1(newScript._rawMeta);
  if (dependhash != this._dependhash && !newScript._dependFail) {
    this._dependhash = dependhash;
    this._icon = newScript._icon;
    this._icon._script = this;
    this._requires = newScript._requires;
    this._resources = newScript._resources;

    // Get rid of old dependencies.
    var dirFiles = this._basedirFile.directoryEntries;
    while (dirFiles.hasMoreElements()) {
      var nextFile = dirFiles.getNext()
          .QueryInterface(Components.interfaces.nsIFile);
      if (!nextFile.equals(this.file)) nextFile.remove(true);
    }

    // Store window references for late injection.
    if ('document-start' == this._runAt) {
      GM_util.logError(
          this.id + "\nNot running at document-start; waiting for update ...",
          true);
      this.pendingExec.push('document-start update');
    } else {
      this.pendingExec.push({'safeWin': safeWin, 'chromeWin': chromeWin});
    }

    // Re-download dependencies.  The timer guarantees that it will
    // reliably complete after the normal document-end time.  (See #1402; going
    // from some -> no requires means this is a short-circuit call.)
    var scriptDownloader = new GM_ScriptDownloader(null, null, null);
    var timer = Components.classes["@mozilla.org/timer;1"]
        .createInstance(Components.interfaces.nsITimer);
    var that = this; // closure-passing safe "this" reference.
    timer.initWithCallback(
        {'notify': function() { scriptDownloader.startUpdateScript(that); }},
        0, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
  }
};

Script.prototype.checkForRemoteUpdate = function(
    currentTime, updateCheckingInterval, forced
) {
  if (this.updateAvailable) return;
  if (!this._updateURL) return;
  if (!GM_prefRoot.getValue("enableUpdateChecking")) return;

  var nextUpdate = parseInt(this._lastUpdateCheck, 10) + updateCheckingInterval;
  if (!forced && currentTime <= nextUpdate) return;

  var lastCheck = this._lastUpdateCheck;
  this._lastUpdateCheck = currentTime;

  var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
      .createInstance(Components.interfaces.nsIXMLHttpRequest);
  req.open("GET", this.updateURL, true);
  req.onload = GM_util.hitch(this, "checkRemoteVersion", req);
  req.onerror = GM_util.hitch(this, "checkRemoteVersionErr", lastCheck);
  req.send(null);
};

Script.prototype.checkRemoteVersion = function(req) {
  if (req.status != 200 && req.status != 0) return;

  var source = req.responseText;
  var newScript = GM_util.getService().config.parse(source);
  var remoteVersion = newScript.version;
  if (!remoteVersion) return;

  var versionChecker = Components
      .classes["@mozilla.org/xpcom/version-comparator;1"]
      .getService(Components.interfaces.nsIVersionComparator);

  if (versionChecker.compare(this._version, remoteVersion) >= 0) return;

  this.updateAvailable = true;
  this._updateVersion = remoteVersion;
  this._changed("update-found", {
    version: remoteVersion,
    url: this._downloadURL,
    secure: this.updateIsSecure
  });
  GM_util.getService().config._save();
};

Script.prototype.checkRemoteVersionErr = function(lastCheck) {
  // Set the time back.
  this._lastUpdateCheck = lastCheck;
  GM_util.getService().config._save();
};

Script.prototype.installUpdate = function(chromeWin) {
  var uri = GM_util.uriFromUrl(this._downloadURL);
  var scriptDownloader = new GM_ScriptDownloader(chromeWin, uri, null);
  scriptDownloader.replacedScript = this;
  scriptDownloader.installOnCompletion_ = true;
  scriptDownloader.startDownload();
};

Script.prototype.allFiles = function() {
  var files = [];
  if (!this._basedirFile.equals(GM_util.scriptDir())) {
    files.push(this._basedirFile);
  }
  files.push(this.file);
  for (var i = 0, r = null; r = this._requires[i]; i++) {
    files.push(r.file);
  }
  for (var i = 0, r = null; r = this._resources[i]; i++) {
    files.push(r.file);
  }
  return files;
};

Script.prototype.fileExists = function(file) {
  try {
    return file.exists();
  } catch (e) {
    return false;
  }
};

Script.prototype.allFilesExist = function() {
  return this.allFiles().every(this.fileExists);
};

Script.prototype.uninstall = function(forUpdate) {
  if ('undefined' == typeof(forUpdate)) forUpdate = false;

  if (this._basedirFile.equals(GM_util.scriptDir())) {
    // if script is in the root, just remove the file
    try {
      this.file.remove(false);
    } catch (e) {
      // Fail silently if it already does not exist.
    }
  } else {
    // if script has its own dir, remove the dir + contents
    try {
      this._basedirFile.remove(true);
    } catch (e) {
      // Fail silently if it already does not exist.
    }
  }

  if (!forUpdate && GM_prefRoot.getValue("uninstallPreferences")) {
    // Remove saved preferences
    GM_prefRoot.remove(this.prefroot);
  }

  GM_util.getService().config._changed(this, "uninstall", null);
};
