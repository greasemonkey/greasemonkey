function Script(config) {
  this._config = config;
  this._observers = [];

  this._downloadURL = null;
  this._tempFile = null;
  this._basedir = null;
  this._filename = null;
  this._modified = null;
  this._dependhash = null;

  this._name = null;
  this._namespace = null;
  this._description = null;
  this._version = null;
  this._updateURL = null;
  this._enabled = true;
  this._includes = [];
  this._excludes = [];
  this._requires = [];
  this._resources = [];
  this._unwrap = false;
  this._dependFail = false
  this.delayInjection = false;
  this._rawMeta = null;
  this._lastUpdateCheck = null;
  this._updateAvailable = null;
}

Script.prototype = {
  matchesURL: function(url) {
    function test(page) {
      return convert2RegExp(page).test(url);
    }

    return this._includes.some(test) && !this._excludes.some(test);
  },

  _changed: function(event, data) { this._config._changed(this, event, data); },

  get name() { return this._name; },
  get namespace() { return this._namespace; },
  get prefroot() { return [
      "scriptvals.", this.namespace, "/", this.name, "."].join(""); },
  get description() { return this._description; },
  get version() { return this._version; },
  get enabled() { return this._enabled; },
  set enabled(enabled) { this._enabled = enabled; this._changed("edit-enabled", enabled); },

  get includes() { return this._includes.concat(); },
  get excludes() { return this._excludes.concat(); },
  addInclude: function(url) { this._includes.push(url); this._changed("edit-include-add", url); },
  removeIncludeAt: function(index) { this._includes.splice(index, 1); this._changed("edit-include-remove", index); },
  addExclude: function(url) { this._excludes.push(url); this._changed("edit-exclude-add", url); },
  removeExcludeAt: function(index) { this._excludes.splice(index, 1); this._changed("edit-exclude-remove", index); },

  get requires() { return this._requires.concat(); },
  get resources() { return this._resources.concat(); },
  get unwrap() { return this._unwrap; },

  get updateURL() {
    if (this._updateURL) return this._updateURL;
    if (this._downloadURL) return this._downloadURL;
    return null;
  },

  get _file() {
    var file = this._basedirFile;
    file.append(this._filename);
    return file;
  },

  get editFile() { return this._file; },

  get _basedirFile() {
    var file = this._config._scriptDir;
    file.append(this._basedir);
    file.normalize();
    return file;
  },

  get fileURL() { return GM_getUriFromFile(this._file).spec; },
  get textContent() { return GM_getContents(this._file); },

  _initFileName: function(name, useExt) {
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
  },

  _initFile: function(tempFile) {
    var file = this._config._scriptDir;
    var name = this._initFileName(this._name, false);

    file.append(name);
    file.createUnique(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0755);
    this._basedir = file.leafName;

    file.append(name + ".user.js");
    file.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0644);
    this._filename = file.leafName;

    GM_log("Moving script file from " + tempFile.path + " to " + file.path);

    file.remove(true);
    tempFile.moveTo(file.parent, file.leafName);
  },

  get urlToDownload() { return this._downloadURL; },
  setDownloadedFile: function(file) { this._tempFile = file; },

  get previewURL() {
    return Components.classes["@mozilla.org/network/io-service;1"]
                     .getService(Components.interfaces.nsIIOService)
                     .newFileURI(this._tempFile).spec;
  },

  isModified: function() {
    this.delayInjection = false;
    if (this._modified != this._file.lastModifiedTime) {
      this._modified = this._file.lastModifiedTime;
      return true;
    }
    return false;
  },

  updateFromNewScript: function(newScript) {
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

    // Copy new values.
    this._includes = newScript._includes;
    this._excludes = newScript._excludes;
    this._name = newScript._name;
    this._namespace = newScript._namespace;
    this._description = newScript._description;
    this._unwrap = newScript._unwrap;
    this._version = newScript._version;

    var dependhash = GM_sha1(newScript._rawMeta);
    if (dependhash != this._dependhash && !newScript._dependFail) {
      this._dependhash = dependhash;
      this._requires = newScript._requires;
      this._resources = newScript._resources;

      // Get rid of old dependencies.
      var dirFiles = this._basedirFile.directoryEntries;
      while (dirFiles.hasMoreElements()) {
        var nextFile = dirFiles.getNext()
            .QueryInterface(Components.interfaces.nsIFile);
        if (!nextFile.equals(this._file)) nextFile.remove(true);
      }

      // Redownload dependencies.
      var scriptDownloader = new GM_ScriptDownloader(null, null, null);
      scriptDownloader.script = this;
      scriptDownloader.updateScript = true;
      scriptDownloader.fetchDependencies();

      this.delayInjection = true;
    }
  },

  checkForRemoteUpdate: function(chromeWin, currentTime, updateCheckingInterval) {
    var updateURL = this.updateURL;
    if (this._updateAvailable ||
        !updateURL ||
        currentTime <= this._lastUpdateCheck + updateCheckingInterval) {
      return;
    }

    // check if the url is from userscripts.org
    var usoURL = updateURL.match(/^(http:\/\/userscripts.org\/[^?]*\.user\.js)\??/);
    if (usoURL) {
      updateURL = usoURL[1].replace(/\.user\.js$/,".meta.js");
    }

    this._lastUpdateCheck = currentTime;

    var lastTimeoutID = null;
    var timeoutHandler = function(timeoutID) {
      if (lastTimeoutID) chromeWin.clearTimeout(lastTimeoutID);
      lastTimeoutID = timeoutID;
    };

    var req = new chromeWin.XMLHttpRequest();
    req.open("GET", updateURL, true);
    req.onload = GM_hitch(this, "checkRemoteVersion", chromeWin, req, timeoutHandler);
    req.send(null);
  },

  checkRemoteVersion: function(chromeWin, req, timeoutHandler) {
    if (req.status != 200 && req.status != 0) {
      return;
    }

    var source = req.responseText;
    var remoteVersion = this._config.parseVersion(source);

    if (remoteVersion) {
      var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                             .getService(Components.interfaces.nsIVersionComparator);

      if(versionChecker.compare(this._version, remoteVersion) < 0) {
        this._updateAvailable = true;
        var config = this._config;
        timeoutHandler(chromeWin.setTimeout(function() {
          config._save();
        }, 1000));
      }
    }
  }
};
