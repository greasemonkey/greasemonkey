// In this file protected properties (prefixed with an underscore) may be
// used anywhere within this file and config.js

/**
 * Checks whether the version has changed since the last run and performs
 * any necessary upgrades.
 */
Config.prototype._updateVersion = function() {
  log("> GM_updateVersion");

  // this is the last version which has been run at least once
  var initialized = GM_prefRoot.getValue("version", "0.0");

  if (GM_compareVersions(initialized, "0.3") == -1)
    this._pointThreeMigrate();

  if (GM_compareVersions(initialized, "0.4.2") == -1)
    this._pointFourMigrate();

  if (GM_compareVersions(initialized, "0.8") == -1)
    this._pointEightBackup();

  // update the currently initialized version so we don't do this work again.
  var extMan = Components.classes["@mozilla.org/extensions/manager;1"]
    .getService(Components.interfaces.nsIExtensionManager);

  var item = extMan.getItemForID(GM_GUID);
  GM_prefRoot.setValue("version", item.version);

  log("< GM_updateVersion");
};

/**
 * In Greasemonkey 0.8 there was a format change to the gm_scripts folder and
 * testing found several bugs where the entire folder would get nuked. So we are
 * paranoid and backup the folder the first time 0.8 runs.
 */
Config.prototype._pointEightBackup = function() {
  var scriptDir = this._newScriptDir;
  var scriptDirBackup = scriptDir.clone();
  scriptDirBackup.leafName += "_08bak";
  if (scriptDir.exists() && !scriptDirBackup.exists())
    scriptDir.copyTo(scriptDirBackup.parent, scriptDirBackup.leafName);
};

/**
 * Copies the entire scripts directory to the new location, if it exists.
 */
Config.prototype._pointFourMigrate = function() {
  log("> GM_pointFourMigrate");

  this._scriptDir; // Create a scripts dir if it does not exist

  log("< GM_pointFourMigrate");
};

/**
 * Migrates the configuration directory from the old format to the new one
 */
Config.prototype._pointThreeMigrate = function() {
  log("> GM_pointThreeMigrate");

  // check to see whether there's any config to migrate
  var configFile = this._oldScriptDir;
  configFile.append("config.xml");
  var configExists = configFile.exists();

  log("config file exists: " + configExists);
  if (!configExists)
    return;

  // back up the config directory
  // if an error happens, report it and exit
  try {
    var scriptDir = this._oldScriptDir;
    var tempDir = getTempFile();

    log("script dir: " + scriptDir.path);
    log("temp dir: " + tempDir.path);

    scriptDir.copyTo(tempDir.parent, tempDir.leafName);

    // update the format of the config.xml file and move each file
    var doc = document.implementation.createDocument("", "", null);

    // first, load config.xml raw and add the new required filename attribute
    doc.async = false;
    doc._load();

    log("loaded existing config...");

    var nodes = document.evaluate("/UserScriptConfig/Script", doc, null,
        XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);

    for (var i = 0, node; node = nodes.snapshotItem(i); i++)
      if (node.hasAttribute("id"))
        node.setAttribute("filename", node.getAttribute("id"));

    // save the config file
    var configStream = getWriteStream(configFile);
    new XMLSerializer().serializeToStream(doc, configStream, "utf-8");
    configStream.close();

    log("config saved.");

    // now, load config normally and reinitialize all scripts's filenames
    this._load();

    log("config reloaded, moving files.");

    for (var i = 0, script = null; script = this._scripts[i]; i++) {
      if (script._filename.match(/^\d+$/)) {
        var scriptFile = this._oldScriptDir;
        scriptFile.append(script._filename);
        script._initFile(scriptFile);
      }
    }

    log("moving complete. saving configuration.");

    // save the config file
    this._save();

    log("0.3 migration completed successfully!");
  } catch (e) {
    alert("Could not complete Greasemonkey 0.3 migration. Some changes may " +
          "have been made to your scripts directory. See JS Console for " +
          "error details.\n\nA backup of your old scripts directory is at: " +
          tempDir.path);
    throw e;
  } finally {
    log("< GM_pointThreeMigrate");
  }
};
