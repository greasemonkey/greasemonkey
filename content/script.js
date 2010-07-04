function Script(configNode) {
  this._observers = [];

  this._downloadURL = null; // Only for scripts not installed
  this._tempFile = null; // Only for scripts not installed
  this._basedir = null;
  this._filename = null;
  this._modified = null;
  this._dependhash = null;

  this._name = null;
  this._namespace = null;
  this._id = null;
  this._prefroot = null;
  this._description = null;
  this._version = null;
  this._enabled = true;
  this.needsUninstall = false;
  this._includes = [];
  this._excludes = [];
  this._requires = [];
  this._resources = [];
  this._unwrap = false;
  this._dependFail = false
  this.delayInjection = false;
  this._rawMeta = null;
  
  if (configNode) this._loadFromConfigNode(configNode);
}

Script.prototype = {
  matchesURL: function(url) {
    function test(page) {
      return convert2RegExp(page).test(url);
    }

    return this._includes.some(test) && !this._excludes.some(test);
  },

  _changed: function(event, data) {
    GM_getConfig()._changed(this, event, data);
  },

  get name() { return this._name; },
  get namespace() { return this._namespace; },
  get id() {
    if (!this._id) this._id = this._namespace + "/" + this._name;
    return this._id;
  },
  get prefroot() { 
    if (!this._prefroot) this._prefroot = ["scriptvals.", this.id, "."].join("");
    return this._prefroot;
  },
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

  get file() {
    var file = this._basedirFile;
    file.append(this._filename);
    return file;
  },

  get _basedirFile() {
    var file = GM_scriptDir();
    file.append(this._basedir);
    try {
      // Can fail if this path does not exist.
      file.normalize();
    } catch (e) {
      // no-op
    }
    return file;
  },

  get fileURL() { return GM_getUriFromFile(this.file).spec; },
  get textContent() { return GM_getContents(this.file); },

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

  _loadFromConfigNode: function(node) {
    if (!this.fileExists(this._basedirFile)) return;

    this._filename = node.getAttribute("filename");
    this._basedir = node.getAttribute("basedir") || ".";
    this._downloadURL = node.getAttribute("installurl") || null;

    if (!node.hasAttribute("modified")
        || !node.hasAttribute("dependhash")
        || !node.hasAttribute("version")
    ) {
      var parsedScript = GM_getConfig().parse(
          this.textContent, this._downloadURL, true);

      this._modified = this.file.lastModifiedTime;
      this._dependhash = GM_sha1(parsedScript._rawMeta);
      this._version = parsedScript._version;

      GM_getConfig()._changed(this, "modified", null);
    } else {
      this._modified = node.getAttribute("modified");
      this._dependhash = node.getAttribute("dependhash");
      this._version = node.getAttribute("version");
    }

    for (var i = 0, childNode; childNode = node.childNodes[i]; i++) {
      switch (childNode.nodeName) {
      case "Include":
        this._includes.push(childNode.textContent);
        break;
      case "Exclude":
        this._excludes.push(childNode.textContent);
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
    this._enabled = node.getAttribute("enabled") == true.toString();
  },
  
  _initFile: function(tempFile) {
    var name = this._initFileName(this._name, false);
    this._basedir = name;

    var file = GM_scriptDir();
    file.append(name);
    file.createUnique(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0755);

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
    if (!this.fileExists(this.file)) return false;
    if (this._modified != this.file.lastModifiedTime) {
      this._modified = this.file.lastModifiedTime;
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

    // Empty cached values.
    this._id = null;
    this._prefroot = null;

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
        if (!nextFile.equals(this.file)) nextFile.remove(true);
      }

      // Redownload dependencies.
      var scriptDownloader = new GM_ScriptDownloader(null, null, null);
      scriptDownloader.script = this;
      scriptDownloader.updateScript = true;
      scriptDownloader.fetchDependencies();

      this.delayInjection = true;
    }
  },
  
  allFiles: function() {
    var files = [];
    if (!this._basedirFile.equals(GM_scriptDir())) {
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
  },
  
  fileExists: function(file) {
    try {
      return file.exists();
    } catch (e) {
      return false;
    }
  },
    
  allFilesExist: function() {
    return this.allFiles().every(this.fileExists);
  },

  uninstall: function() {
    if (this._basedirFile.equals(GM_scriptDir())) {
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

    if (GM_prefRoot.getValue("uninstallPreferences")) {
      // Remove saved preferences
      GM_prefRoot.remove(this.prefroot);
    }

    GM_getConfig()._changed(this, "uninstall", null);
  }
};
