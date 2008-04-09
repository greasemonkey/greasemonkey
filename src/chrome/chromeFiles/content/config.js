function Config() {
  this._scripts = null;
  this._configFile = this._scriptDir;
  this._configFile.append("config.xml");
  this._initScriptDir();

  this._observers = [];

  this._updateVersion();
  this._load();
}

Config.prototype = {
  addObserver: function(observer, script) {
    var observers = script ? script._observers : this._observers;
    observers.push(observer);
  },

  removeObserver: function(observer, script) {
    var observers = script ? script._observers : this._observers;
    var index = observers.indexOf(observer);
    if (index == -1) throw new Error("Observer not found");
    observers.splice(index, 1);
  },

  _notifyObservers: function(script, event, data) {
    var observers = this._observers.concat(script._observers);
    for (var i = 0, observer; observer = observers[i]; i++) {
      observer.notifyEvent(script, event, data);
    }
  },

  _changed: function(script, event, data) {
    this._save();
    this._notifyObservers(script, event, data);
  },

  installIsUpdate: function(script) {
    return this._find(script) > -1;
  },

  _find: function(aScript) {
    namespace = aScript._namespace.toLowerCase();
    name = aScript._name.toLowerCase();

    for (var i = 0, script; script = this._scripts[i]; i++) {
      if (script._namespace.toLowerCase() == namespace
        && script._name.toLowerCase() == name) {
        return i;
      }
    }

    return -1;
  },

  _load: function() {
    var domParser = Components.classes["@mozilla.org/xmlextras/domparser;1"]
                              .createInstance(Components.interfaces.nsIDOMParser);

    var configContents = getContents(this._configFile);
    var doc = domParser.parseFromString(configContents, "text/xml");
    var nodes = doc.evaluate("/UserScriptConfig/Script", doc, null, 0, null);

    this._scripts = [];

    for (var node = null; node = nodes.iterateNext(); ) {
      var script = new Script(this);

      for (var i = 0, childNode; childNode = node.childNodes[i]; i++) {
        switch (childNode.nodeName) {
        case "Include":
          script._includes.push(childNode.firstChild.nodeValue);
          break;
        case "Exclude":
          script._excludes.push(childNode.firstChild.nodeValue);
          break;
        case "Require":
          var scriptRequire = new ScriptRequire(script);
          scriptRequire._filename = childNode.getAttribute("filename");
          script._requires.push(scriptRequire);
          break;
        case "Resource":
          var scriptResource = new ScriptResource(script);
          scriptResource._name = childNode.getAttribute("name");
          scriptResource._filename = childNode.getAttribute("filename");
          scriptResource._mimetype = childNode.getAttribute("mimetype");
          scriptResource._charset = childNode.getAttribute("charset");
          script._resources.push(scriptResource);
          break;
        }
      }

      script._filename = node.getAttribute("filename");
      script._name = node.getAttribute("name");
      script._namespace = node.getAttribute("namespace");
      script._description = node.getAttribute("description");
      script._enabled = node.getAttribute("enabled") == true.toString();
      script._basedir = node.getAttribute("basedir") || ".";

      this._scripts.push(script);
    }
  },

  _save: function() {
    var doc = Components.classes["@mozilla.org/xmlextras/domparser;1"]
      .createInstance(Components.interfaces.nsIDOMParser)
      .parseFromString("<UserScriptConfig></UserScriptConfig>", "text/xml");

    for (var i = 0, scriptObj; scriptObj = this._scripts[i]; i++) {
      var scriptNode = doc.createElement("Script");

      for (var j = 0; j < scriptObj._includes.length; j++) {
        var includeNode = doc.createElement("Include");
        includeNode.appendChild(doc.createTextNode(scriptObj._includes[j]));
        scriptNode.appendChild(doc.createTextNode("\n\t\t"));
        scriptNode.appendChild(includeNode);
      }

      for (var j = 0; j < scriptObj._excludes.length; j++) {
        var excludeNode = doc.createElement("Exclude");
        excludeNode.appendChild(doc.createTextNode(scriptObj._excludes[j]));
        scriptNode.appendChild(doc.createTextNode("\n\t\t"));
        scriptNode.appendChild(excludeNode);
      }

      for (var j = 0; j < scriptObj._requires.length; j++) {
        var req = scriptObj._requires[j];
        var resourceNode = doc.createElement("Require");

        resourceNode.setAttribute("filename", req._filename);

        scriptNode.appendChild(doc.createTextNode("\n\t\t"));
        scriptNode.appendChild(resourceNode);
      }

      for (var j = 0; j < scriptObj._resources.length; j++) {
        var imp = scriptObj._resources[j];
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

      scriptNode.appendChild(doc.createTextNode("\n\t"));

      scriptNode.setAttribute("filename", scriptObj._filename);
      scriptNode.setAttribute("name", scriptObj._name);
      scriptNode.setAttribute("namespace", scriptObj._namespace);
      scriptNode.setAttribute("description", scriptObj._description);
      scriptNode.setAttribute("enabled", scriptObj._enabled);
      scriptNode.setAttribute("basedir", scriptObj._basedir);

      doc.firstChild.appendChild(doc.createTextNode("\n\t"));
      doc.firstChild.appendChild(scriptNode);
    }

    doc.firstChild.appendChild(doc.createTextNode("\n"));

    var configStream = getWriteStream(this._configFile);
    Components.classes["@mozilla.org/xmlextras/xmlserializer;1"]
      .createInstance(Components.interfaces.nsIDOMSerializer)
      .serializeToStream(doc, configStream, "utf-8");
    configStream.close();
  },

  parse: function(source, uri) {
    var ioservice = Components.classes["@mozilla.org/network/io-service;1"]
                              .getService(Components.interfaces.nsIIOService);

    var script = new Script(this);
    script._downloadURL = uri.spec;
    script._enabled = true;

    // read one line at a time looking for start meta delimiter or EOF
    var lines = source.match(/.+/g);
    var lnIdx = 0;
    var result = {};
    var foundMeta = false;

    while ((result = lines[lnIdx++])) {
      if (result.indexOf("// ==UserScript==") == 0) {
        foundMeta = true;
        break;
      }
    }

    // gather up meta lines
    if (foundMeta) {
      // used for duplicate resource name detection
      var previousResourceNames = {};

      while ((result = lines[lnIdx++])) {
        if (result.indexOf("// ==/UserScript==") == 0) {
          break;
        }

        var match = result.match(/\/\/ \@(\S+)\s+([^\n]+)/);
        if (match != null) {
          switch (match[1]) {
            case "name":
            case "namespace":
            case "description":
              script["_" + match[1]] = match[2];
              break;
            case "include":
              script._includes.push(match[2]);
              break;
            case "exclude":
              script._excludes.push(match[2]);
              break;
            case "require":
              var reqUri = ioservice.newURI(match[2], null, uri);
              var scriptRequire = new ScriptRequire(script);
              scriptRequire._downloadURL = reqUri.spec;
              script._requires.push(scriptRequire);
              break;
            case "resource":
              var res = match[2].match(/(\S+)\s+(.*)/);
              if (res === null) {
                // NOTE: Unlocalized strings
                throw new Error("Invalid syntax for @resource declaration '" +
                                match[2] + "'. Resources are declared like: " +
                                "@resource <name> <url>.");
              }

              var resName = res[1];
              if (previousResourceNames[resName]) {
                throw new Error("Duplicate resource name '" + resName + "' " +
                                "detected. Each resource must have a unique " +
                                "name.");
              } else {
                previousResourceNames[resName] = true;
              }

              var resUri = ioservice.newURI(res[2], null, uri);
              var scriptResource = new ScriptResource(script);
              scriptResource._name = resName;
              scriptResource._downloadURL = resUri.spec;
              script._resources.push(scriptResource);
              break;
          }
        }
      }
    }

    // if no meta info, default to reasonable values
    if (script._name == null) script._name = parseScriptName(uri);
    if (script._namespace == null) script._namespace = uri.host;
    if (!script._description) script._description = "";
    if (script._includes.length == 0) script._includes.push("*");

    return script;
  },

  install: function(script) {
    GM_log("> Config.install");

    var existingIndex = this._find(script);
    if (existingIndex > -1) {
      this.uninstall(this._scripts[existingIndex], false);
    }

    script._initFile(script._tempFile);
    script._tempFile = null;

    for (var i = 0; i < script._requires.length; i++) {
      script._requires[i]._initFile();
    }

    for (var i = 0; i < script._resources.length; i++) {
      script._resources[i]._initFile();
    }

    this._scripts.push(script);
    this._changed(script, "install", null);

    GM_log("< Config.install");
  },

  uninstall: function(script, uninstallPrefs) {
    var idx = this._find(script);
    this._scripts.splice(idx, 1);
    this._changed(script, "uninstall", null);

    // watch out for cases like basedir="." and basedir="../gm_scripts"
    if (!script._basedirFile.equals(this._scriptDir)) {
      // if script has its own dir, remove the dir + contents
      script._basedirFile.remove(true);
    } else {
      // if script is in the root, just remove the file
      script._file.remove(false);
    }

    if (uninstallPrefs) {
      // Remove saved preferences
      GM_prefRoot.remove("scriptvals." + script._namespace + "/" + script._name + ".");
    }
  },

  /**
   * Moves an installed user script to a new position in the array of installed scripts.
   *
   * @param script The script to be moved.
   * @param destination Can be either (a) a numeric offset for the script to be
   *                    moved or (b) another installet script to which position
   *                    the script will be moved.
   */
  move: function(script, destination) {
    var from = this._scripts.indexOf(script);
    var to = -1;

    // Make sure the user script is installed
    if (from == -1) return;

    if (typeof destination == "number") { // if destination is an offset
      to = from + destination;
      to = Math.max(0, to);
      to = Math.min(this._scripts.length - 1, to);
    } else { // if destination is a script object
      to = this._scripts.indexOf(destination);
    }

    if (to == -1) return;

    var tmp = this._scripts.splice(from, 1)[0];
    this._scripts.splice(to, 0, tmp);
    this._changed(script, "move", to);
  },

  get _scriptDir() {
    var file = Components.classes["@mozilla.org/file/directory_service;1"]
                         .getService(Components.interfaces.nsIProperties)
                         .get("ProfD", Components.interfaces.nsILocalFile);
    file.append("gm_scripts");
    return file;
  },

  /**
   * Create an empty configuration if none exist.
   */
  _initScriptDir: function() {
    var dir = this._scriptDir;

    if (!dir.exists()) {
      dir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0755);

      var configStream = getWriteStream(this._configFile);
      var xml = "<UserScriptConfig/>";
      configStream.write(xml, xml.length);
      configStream.close();
    }
  },

  get scripts() { return this._scripts.concat(); },
  getMatchingScripts: function(testFunc) { return this._scripts.filter(testFunc); },

  /**
   * Checks whether the version has changed since the last run and performs
   * any necessary upgrades.
   */
  _updateVersion: function() {
    log("> GM_updateVersion");

    // this is the last version which has been run at least once
    var initialized = GM_prefRoot.getValue("version", "0.0");

    if (GM_compareVersions(initialized, "0.8") == -1)
      this._pointEightBackup();

    // update the currently initialized version so we don't do this work again.
    var extMan = Components.classes["@mozilla.org/extensions/manager;1"]
      .getService(Components.interfaces.nsIExtensionManager);

    var item = extMan.getItemForID(GM_GUID);
    GM_prefRoot.setValue("version", item.version);

    log("< GM_updateVersion");
  },

  /**
   * In Greasemonkey 0.8 there was a format change to the gm_scripts folder and
   * testing found several bugs where the entire folder would get nuked. So we
   * are paranoid and backup the folder the first time 0.8 runs.
   */
  _pointEightBackup: function() {
    var scriptDir = this._scriptDir;
    var scriptDirBackup = scriptDir.clone();
    scriptDirBackup.leafName += "_08bak";
    if (scriptDir.exists() && !scriptDirBackup.exists())
      scriptDir.copyTo(scriptDirBackup.parent, scriptDirBackup.leafName);
  }
};

function Script(config) {
  this._config = config;
  this._observers = [];

  this._downloadURL = null; // Only for scripts not installed
  this._tempFile = null; // Only for scripts not installed
  this._basedir = null;
  this._filename = null;

  this._name = null;
  this._namespace = null;
  this._description = null;
  this._enabled = true;
  this._includes = [];
  this._excludes = [];
  this._requires = [];
  this._resources = [];
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
  get description() { return this._description; },
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
  get textContent() { return getContents(this._file); },

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
  }
};

function ScriptRequire(script) {
  this._script = script;

  this._downloadURL = null; // Only for scripts not installed
  this._tempFile = null; // Only for scripts not installed
  this._filename = null;
}

ScriptRequire.prototype = {
  get _file() {
    var file = this._script._basedirFile;
    file.append(this._filename);
    return file;
  },

  get fileURL() { return GM_getUriFromFile(this._file).spec; },
  get textContent() { return getContents(this._file); },

  _initFile: function() {
    var name = this._downloadURL.substr(this._downloadURL.lastIndexOf("/") + 1);
    if(name.indexOf("?") > 0) {
      name = name.substr(0, name.indexOf("?"));
    }
    name = this._script._initFileName(name, true);

    var file = this._script._basedirFile;
    file.append(name);
    file.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0644);
    this._filename = file.leafName;

    GM_log("Moving dependency file from " + this._tempFile.path + " to " + file.path);

    file.remove(true);
    this._tempFile.moveTo(file.parent, file.leafName);
    this._tempFile = null;
  },

  get urlToDownload() { return this._downloadURL; },
  setDownloadedFile: function(file) { this._tempFile = file; }
};

function ScriptResource(script) {
  this._script = script;

  this._downloadURL = null; // Only for scripts not installed
  this._tempFile = null; // Only for scripts not installed
  this._filename = null;
  this._mimetype = null;
  this._charset = null;

  this._name = null;
}

ScriptResource.prototype = {
  get name() { return this._name; },

  get _file() {
    var file = this._script._basedirFile;
    file.append(this._filename);
    return file;
  },

  get textContent() { return getContents(this._file); },

  get dataContent() {
    var appSvc = Components.classes["@mozilla.org/appshell/appShellService;1"]
                           .getService(Components.interfaces.nsIAppShellService);

    var window = appSvc.hiddenDOMWindow;
    var binaryContents = getBinaryContents(this._file);

    var mimetype = this._mimetype;
    if (this._charset && this._charset.length > 0) {
      mimetype += ";charset=" + this._charset;
    }

    return "data:" + mimetype + ";base64," +
      window.encodeURIComponent(window.btoa(binaryContents));
  },

  _initFile: ScriptRequire.prototype._initFile,

  get urlToDownload() { return this._downloadURL; },
  setDownloadedFile: function(tempFile, mimetype, charset) {
    this._tempFile = tempFile;
    this._mimetype = mimetype;
    this._charset = charset;
  }
};
