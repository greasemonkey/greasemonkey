function Config() {
  this._saveTimer = null;
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

  _changed: function(script, event, data, dontSave) {
    if (!dontSave) {
      this._save();
    }

    this._notifyObservers(script, event, data);
  },

  installIsUpdate: function(script) {
    return this._find(script) > -1;
  },

  _find: function(aScript) {
    var namespace = aScript._namespace.toLowerCase();
    var name = aScript._name.toLowerCase();

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

    var configContents = GM_getContents(this._configFile);
    var doc = domParser.parseFromString(configContents, "text/xml");
    var nodes = doc.evaluate("/UserScriptConfig/Script", doc, null, 0, null);
    var fileModified = false;

    this._scripts = [];

    for (var node = null; node = nodes.iterateNext(); ) {
      var script = new Script(this);

      script._filename = node.getAttribute("filename");
      script._basedir = node.getAttribute("basedir") || ".";
      script._downloadURL = node.getAttribute("installurl") || null;

      if (!node.getAttribute("modified")
          || !node.getAttribute("dependhash")
          || !node.getAttribute("version")
      ) {
        script._modified = script._file.lastModifiedTime;
        var parsedScript = this.parse(
            GM_getContents(script._file), script._downloadURL, true);
        script._dependhash = GM_sha1(parsedScript._rawMeta);
        script._version = parsedScript._version;
        fileModified = true;
      } else {
        script._modified = node.getAttribute("modified");
        script._dependhash = node.getAttribute("dependhash");
        script._version = node.getAttribute("version");
      }

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
        case "Unwrap":
          script._unwrap = true;
          break;
        }
      }

      script._name = node.getAttribute("name");
      script._namespace = node.getAttribute("namespace");
      script._description = node.getAttribute("description");
      script._enabled = node.getAttribute("enabled") == true.toString();
      script._earlyInject = node.getAttribute("early") == true.toString();

      this._scripts.push(script);
    }

    if (fileModified) {
      this._save();
    }
  },

  _save: function(saveNow) {
    // If we have not explicitly been told to save now, then defer execution
    // via a timer, to avoid locking up the UI.
    if (!saveNow) {
      // Reduce work in the case of many changes near to each other in time.
      if (this._saveTimer) {
        this._saveTimer.cancel(this._saveTimer);
      }

      this._saveTimer = Components.classes["@mozilla.org/timer;1"]
          .createInstance(Components.interfaces.nsITimer);

      var _save = GM_hitch(this, "_save"); // dereference 'this' for the closure
      this._saveTimer.initWithCallback(
          {'notify': function() { _save(true); }}, 250,
          Components.interfaces.nsITimer.TYPE_ONE_SHOT);
      return;
    }

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

      if (scriptObj._unwrap) {
        scriptNode.appendChild(doc.createTextNode("\n\t\t"));
        scriptNode.appendChild(doc.createElement("Unwrap"));
      }

      scriptNode.appendChild(doc.createTextNode("\n\t"));

      scriptNode.setAttribute("filename", scriptObj._filename);
      scriptNode.setAttribute("name", scriptObj._name);
      scriptNode.setAttribute("namespace", scriptObj._namespace);
      scriptNode.setAttribute("description", scriptObj._description);
      scriptNode.setAttribute("version", scriptObj._version);
      scriptNode.setAttribute("enabled", scriptObj._enabled);
      scriptNode.setAttribute("early", scriptObj._earlyInject);
      scriptNode.setAttribute("basedir", scriptObj._basedir);
      scriptNode.setAttribute("modified", scriptObj._modified);
      scriptNode.setAttribute("dependhash", scriptObj._dependhash);

      if (scriptObj._downloadURL) {
        scriptNode.setAttribute("installurl", scriptObj._downloadURL);
      }

      doc.firstChild.appendChild(doc.createTextNode("\n\t"));
      doc.firstChild.appendChild(scriptNode);
    }

    doc.firstChild.appendChild(doc.createTextNode("\n"));

    var configStream = GM_getWriteStream(this._configFile);
    Components.classes["@mozilla.org/xmlextras/xmlserializer;1"]
      .createInstance(Components.interfaces.nsIDOMSerializer)
      .serializeToStream(doc, configStream, "utf-8");
    configStream.close();
  },

  parse: function(source, uri, updating) {
    var script = new Script(this);

    if (uri) {
      script._downloadURL = uri.spec;
      script._enabled = true;
    }

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
      script._rawMeta = "";

      while ((result = lines[lnIdx++])) {
        if (result.indexOf("// ==/UserScript==") == 0) {
          break;
        }

        var match = result.match(/\/\/ \@(\S+)(?:\s+([^\n]+))?/);
        if (match === null) continue;

        var header = match[1];
        var value = match[2];

        if (!value) {
          switch (header) {
            case "unwrap":
              script._unwrap = true;
              break;
            default:
              continue;
          }
        }

        switch (header) {
          case "name":
          case "namespace":
          case "description":
          case "version":
            script["_" + header] = value;
            break;
          case "run-at":
            if (value=="document-start") script._earlyInject = true;
            break;
          case "include":
            script._includes.push(value);
            break;
          case "exclude":
            script._excludes.push(value);
            break;
          case "require":
            try {
              var reqUri = GM_uriFromUrl(value, uri);
              var scriptRequire = new ScriptRequire(script);
              scriptRequire._downloadURL = reqUri.spec;
              script._requires.push(scriptRequire);
              script._rawMeta += header + '\0' + value + '\0';
            } catch (e) {
              if (updating) {
                script._dependFail = true;
              } else {
                throw new Error('Failed to @require '+ value);
              }
            }
            break;
          case "resource":
            var res = value.match(/(\S+)\s+(.*)/);
            if (res === null) {
              // NOTE: Unlocalized strings
              throw new Error("Invalid syntax for @resource declaration '" +
                              value + "'. Resources are declared like: " +
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

            try {
              var resUri = GM_uriFromUrl(res[2], uri);
              var scriptResource = new ScriptResource(script);
              scriptResource._name = resName;
              scriptResource._downloadURL = resUri.spec;
              script._resources.push(scriptResource);
              script._rawMeta += header + '\0' + resName + '\0' + resUri.spec + '\0';
            } catch (e) {
              if (updating) {
                script._dependFail = true;
              } else {
                throw new Error('Failed to get @resource '+ resName +' from '+
                                res[2]);
              }
            }
            break;
        }
      }
    }

    // if no meta info, default to reasonable values
    if (!script._name && uri) script._name = GM_parseScriptName(uri);
    if (!script._namespace && uri) script._namespace = uri.host;
    if (!script._description) script._description = "";
    if (!script._version) script._version = "";
    if (script._includes.length == 0) script._includes.push("*");

    return script;
  },

  install: function(script) {
    GM_log("> Config.install");

    var existingIndex = this._find(script);
    if (existingIndex > -1) {
      this.uninstall(this._scripts[existingIndex]);
    }

    script._initFile(script._tempFile);
    script._tempFile = null;

    for (var i = 0; i < script._requires.length; i++) {
      script._requires[i]._initFile();
    }

    for (var i = 0; i < script._resources.length; i++) {
      script._resources[i]._initFile();
    }

    script._modified = script._file.lastModifiedTime;
    script._metahash = GM_sha1(script._rawMeta);

    this._scripts.push(script);
    this._changed(script, "install", null);

    GM_log("< Config.install");
  },

  uninstall: function(script) {
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

    if (GM_prefRoot.getValue("uninstallPreferences")) {
      // Remove saved preferences
      GM_prefRoot.remove(script.prefroot);
    }
  },

  /**
   * Moves an installed user script to a new position in the array of installed scripts.
   *
   * @param script The script to be moved.
   * @param destination Can be either (a) a numeric offset for the script to be
   *                    moved by, or (b) another installed script to which
   *                    position the script will be moved.
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

      var configStream = GM_getWriteStream(this._configFile);
      var xml = "<UserScriptConfig/>";
      configStream.write(xml, xml.length);
      configStream.close();
    }
  },

  get scripts() { return this._scripts.concat(); },
  getMatchingScripts: function(testFunc) { return this._scripts.filter(testFunc); },
  injectScript: function(script) {
    var unsafeWin = this.wrappedContentWin.wrappedJSObject;
    var unsafeLoc = new XPCNativeWrapper(unsafeWin, "location").location;
    var href = new XPCNativeWrapper(unsafeLoc, "href").href;

    if (script.enabled && script.matchesURL(href)) {
      greasemonkeyService.injectScripts([script], href, unsafeWin, this.chromeWin);
    }
  },

  updateModifiedScripts: function() {
    // Find any updated scripts
    var scripts = this.getMatchingScripts(
        function (script) { return script.isModified(); });
    if (0 == scripts.length) return;

    for (var i = 0, script; script = scripts[i]; i++) {
      var parsedScript = this.parse(
          GM_getContents(script._file), script._downloadURL, true);
      script.updateFromNewScript(parsedScript);
      this._changed(script, "modified", null, true);
    }

    this._save();
  },

  /**
   * Checks whether the version has changed since the last run and performs
   * any necessary upgrades.
   */
  _updateVersion: function() {
    GM_log("> GM_updateVersion");

    // this is the last version which has been run at least once
    var initialized = GM_prefRoot.getValue("version", "0.0");

    if ("0.0" == initialized) {
      // this is the first launch.  show the welcome screen.

      // find an open window.
      var windowManager = Components
           .classes['@mozilla.org/appshell/window-mediator;1']
           .getService(Components.interfaces.nsIWindowMediator);
      var chromeWin = windowManager.getMostRecentWindow("navigator:browser");
      // if we found it, use it to open a welcome tab
      if (chromeWin.gBrowser) {
        // the setTimeout makes sure we do not execute too early -- sometimes
        // the window isn't quite ready to add a tab yet
        chromeWin.setTimeout(
            "gBrowser.selectedTab = gBrowser.addTab(" +
            "'http://wiki.greasespot.net/Welcome')", 0);
      }
    }

    if (GM_compareVersions(initialized, "0.8") == -1)
      this._pointEightBackup();

    // update the currently initialized version so we don't do this work again.
    if ("@mozilla.org/extensions/manager;1" in Components.classes) {
      // Firefox <= 3.6.*
      var extMan = Components.classes["@mozilla.org/extensions/manager;1"]
          .getService(Components.interfaces.nsIExtensionManager);
      var item = extMan.getItemForID(GM_GUID);
      GM_prefRoot.setValue("version", item.version);
    } else {
      // Firefox 3.7+
      Components.utils.import("resource://gre/modules/AddonManager.jsm");
      AddonManager.getAddonByID(GM_GUID, function(addon) {
         GM_prefRoot.setValue("version", addon.version);
      });
    }

    GM_log("< GM_updateVersion");
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
