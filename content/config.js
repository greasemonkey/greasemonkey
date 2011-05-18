function Config() {
  this._saveTimer = null;
  this._scripts = null;
  this._configFile = GM_scriptDir();
  this._configFile.append("config.xml");
  this._initScriptDir();

  this._observers = [];
}

Config.prototype = {
  initialize: function() {
    this._updateVersion();
    this._load();
  },

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
    for (var i = 0, script; script = this._scripts[i]; i++) {
      if (script.id == aScript.id) {
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
    var nodes = doc.evaluate("/UserScriptConfig/Script", doc, null,
        7 /* XPathResult.ORDERED_NODE_SNAPSHOT_TYPE */,
        null);

    this._scripts = [];
    for (var i=0, node=null; node=nodes.snapshotItem(i); i++) {
      var script = new Script(node);
      if (script.allFilesExist()) {
        this._scripts.push(script);
      } else {
        // TODO: Add a user prompt to restore the missing script here?
        // Perhaps sometime after update works, and we know where to
        // download the script from?
        node.parentNode.removeChild(node);
        this._changed(script, "missing-removed", null);
      }
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
      doc.firstChild.appendChild(doc.createTextNode("\n\t"));
      doc.firstChild.appendChild(scriptObj.toConfigNode(doc));
    }

    doc.firstChild.appendChild(doc.createTextNode("\n"));

    var configStream = GM_getWriteStream(this._configFile);
    Components.classes["@mozilla.org/xmlextras/xmlserializer;1"]
      .createInstance(Components.interfaces.nsIDOMSerializer)
      .serializeToStream(doc, configStream, "utf-8");
    configStream.close();
  },

  parse: function(source, uri, updateScript) {
    var script = new Script();

    if (uri) script._downloadURL = uri.spec;

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
          case "include":
            script._includes.push(value);
            break;
          case "exclude":
            script._excludes.push(value);
            break;
          case "icon":
            script._rawMeta += header + '\0' + value + '\0';
            try {
              script.icon.metaVal = value;
            } catch (e) {
              if (updateScript) {
                script._dependFail = true;
              } else if (script.icon.dataUriError) {
                throw new Error(e.message);
              } else {
                throw new Error('Failed to get @icon '+ value);
              }
            }
            break;
          case "require":
            try {
              var reqUri = GM_uriFromUrl(value, uri);
              var scriptRequire = new ScriptRequire(script);
              scriptRequire._downloadURL = reqUri.spec;
              script._requires.push(scriptRequire);
              script._rawMeta += header + '\0' + value + '\0';
            } catch (e) {
              if (updateScript) {
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
              if (updateScript) {
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
    if (!script._name) {
      script._name = GM_parseScriptName((uri && uri.spec)
          || (updateScript && updateScript.filename));
    }
    if (!script._namespace && uri) script._namespace = uri.host;
    if (!script._description) script._description = "";
    if (!script._version) script._version = "";
    if (script._includes.length == 0) script._includes.push("*");

    return script;
  },

  install: function(script) {
    var existingIndex = this._find(script);
    if (existingIndex > -1) {
      // save the old script's state
      script._enabled = this._scripts[existingIndex].enabled;

      // uninstall the old script
      this.uninstall(this._scripts[existingIndex], true);
    }

    script._initFile(script._tempFile);
    script._tempFile = null;

    // if icon had to be downloaded, then move the file
    if (script.icon.hasDownloadURL()) {
      script.icon._initFile();
    }

    for (var i = 0; i < script._requires.length; i++) {
      script._requires[i]._initFile();
    }

    for (var i = 0; i < script._resources.length; i++) {
      script._resources[i]._initFile();
    }

    script._modified = script.file.lastModifiedTime;
    script._dependhash = GM_sha1(script._rawMeta);

    this._scripts.push(script);

    if (existingIndex > -1) {
      this.move(script, existingIndex - this._scripts.length + 1);
    }

    this._changed(script, "install", existingIndex);
  },

  uninstall: function(script, forUpdate) {
    if ('undefined' == typeof(forUpdate)) forUpdate = false;

    var idx = this._find(script);
    this._scripts.splice(idx, 1);
    script.uninstall(forUpdate);
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

  /**
   * Create an empty configuration if none exist.
   */
  _initScriptDir: function() {
    var dir = GM_scriptDir();
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

  updateModifiedScripts: function(safeWin, chromeWin) {
    // Find any updated scripts or scripts with delayed injection
    var scripts = this.getMatchingScripts(
        function (script) {
          return script.isModified() || 0 != script.pendingExec.length;
        });
    if (0 == scripts.length) return;

    for (var i = 0, script; script = scripts[i]; i++) {
      if (0 == script.pendingExec.length) {
        var oldScriptId = new String(script.id);
        var parsedScript = this.parse(
            script.textContent, GM_uriFromUrl(script._downloadURL), !!script);
        script.updateFromNewScript(parsedScript, safeWin, chromeWin);
        this._changed(script, "modified", oldScriptId, true);
      } else {
        // We are already downloading dependencies for this script
        // so add its window to the list
        script.pendingExec.push({'safeWin': safeWin, 'chromeWin': chromeWin});
      }
    }

    this._save();
  },

  /**
   * Checks whether the version has changed since the last run and performs
   * any necessary upgrades.
   */
  _updateVersion: function() {
    // this is the last version which has been run at least once
    var initialized = GM_prefRoot.getValue("version", "0.0");

    if ("0.0" == initialized) {
      // this is the first launch.  show the welcome screen.

      var chromeWin = GM_getBrowserWindow();
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
  },

  /**
   * In Greasemonkey 0.8 there was a format change to the gm_scripts folder and
   * testing found several bugs where the entire folder would get nuked. So we
   * are paranoid and backup the folder the first time 0.8 runs.
   */
  _pointEightBackup: function() {
    var scriptDir = GM_scriptDir();
    var scriptDirBackup = scriptDir.clone();
    scriptDirBackup.leafName += "_08bak";
    if (scriptDir.exists() && !scriptDirBackup.exists())
      scriptDir.copyTo(scriptDirBackup.parent, scriptDirBackup.leafName);
  }
};
