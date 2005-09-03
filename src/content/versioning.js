/*
=== START LICENSE ===

Copyright 2004-2005 Aaron Boodman

Contributors:
Jeremy Dunck, Nikolas Coukouma, Matthew Gray.

Permission is hereby granted, free of charge, to any person obtaining a copy 
of this software and associated documentation files (the "Software"), to deal 
in the Software without restriction, including without limitation the rights 
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell 
copies of the Software, and to permit persons to whom the Software is 
furnished to do so, subject to the following conditions:

Note that this license applies only to the Greasemonkey extension source 
files, not to the user scripts which it runs. User scripts are licensed 
separately by their authors.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE 
SOFTWARE.

=== END LICENSE ===

The above copyright notice and this permission notice shall be included in all 
copies or substantial portions of the Software.
*/

/**
 * Checks whether the version has changed since the last run and performs 
 * any necessary upgrades.
 */
function GM_updateVersion() {
  GM_log("> GM_updateVersion");

  // this is the last version which has been run at least once
  var initialized = GM_prefRoot.getValue("version", "0.0");
  
  if (!GM_versionIsGreaterOrEqual(initialized, "0.3")) {
    GM_pointThreeMigrate();
  }
  
  if (!GM_versionIsGreaterOrEqual(initialized, "0.4.2")) {
    GM_pointFourMigrate();
  }

  // update the currently initialized version so we don't do this work again.
  GM_prefRoot.setValue("version", "0.5.3");

  GM_log("< GM_updateVersion");
}

/**
 * Copies the entire scripts directory to the new location, if it exists.
 */
function GM_pointFourMigrate() {
  GM_log("> GM_pointFourMigrate");

  try {
    // the following code was copied directly from the old getContentDir() and
    // getScriptsDir() functions
    var profDir = Components.classes["@mozilla.org/file/directory_service;1"]
                            .getService(Components.interfaces.nsIProperties)
                            .get("ProfD", Components.interfaces.nsILocalFile);

    var contentDir = getContentDir();
    var newScriptsDir = getScriptDir();
    var newConfigFile = getScriptFile("config.xml");

    var oldScriptsDir = contentDir.clone();
    oldScriptsDir.append("scripts");
    var oldConfigFile = oldScriptsDir.clone();
    oldConfigFile.append("config.xml");

    var defaultConfigFile = getContentDir();
    defaultConfigFile.append("default-config.xml");

    GM_log("old scripts dir exists: " + oldScriptsDir.exists());
    GM_log("old config file exists: " + oldConfigFile.exists());
    GM_log("new scripts dir exists: " + newScriptsDir.exists());

    if (oldScriptsDir.exists() && oldConfigFile.exists()) {
      if (!newScriptsDir.exists()) {
        oldScriptsDir.copyTo(newScriptsDir.parent, newScriptsDir.leafName);

        try {
          //oldScriptsDir.remove(true);
        } catch (e) {
          // pffft.... :-)
          // stupid permissions can bite me
        }
      }
    } else {
      if (!newScriptsDir.exists()) {
        newScriptsDir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE,
                             0755);
      }
    
      GM_log("new config file exists: " + newConfigFile.exists());

      if (!newConfigFile.exists()) {
        defaultConfigFile.copyTo(newConfigFile.parent, newConfigFile.leafName);
        defaultConfigFile.permissions = 0644;
      }
    }
  } catch (e) {
    alert("Could not complete Greasemonkey 0.4 migration. Error:\n\n" + e);
    throw e;
  } finally {
    GM_log("< GM_pointFourMigrate");
  }
}

/**
 * Migrates the configuration directory from the old format to the new one
 */
function GM_pointThreeMigrate() {
  GM_log("> GM_pointThreeMigrate");

  // check to see whether there's any config to migrate
  var configExists = GM_getPointThreeScriptFile("config.xml").exists();

  GM_log("config file exists: " + configExists);
  if (!configExists) {
    return;
  }
  
  // back up the config directory
  // if an error happens, report it and exit
  try {
    var scriptDir = GM_getPointThreeScriptDir();
    var tempDir = getTempFile();

    GM_log("script dir: " + scriptDir.path);
    GM_log("temp dir: " + tempDir.path);

    scriptDir.copyTo(tempDir.parent, tempDir.leafName);
  
    // update the format of the config.xml file and move each file
    var script = null;
    var scriptFile = null;
    var doc = document.implementation.createDocument("", "", null);
    var configFile = GM_getPointThreeScriptFile("config.xml");
    
    var configURI = Components.classes["@mozilla.org/network/io-service;1"]
                              .getService(Components.interfaces.nsIIOService)
                              .newFileURI(configFile);

    // first, load config.xml raw and add the new required filename attribute
    doc.async = false;
    doc.load(configURI.spec);
  
    GM_log("loaded existing config...");

    var nodes = document.evaluate("/UserScriptConfig/Script", doc, null,
        XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    var node;

    for (var i = 0; (node = nodes.snapshotItem(i)); i++) {
      if (node.hasAttribute("id")) {
        node.setAttribute("filename", node.getAttribute("id"));
      }
    }
  
    // save the config file
    var configStream = getWriteStream(configFile);
    new XMLSerializer().serializeToStream(doc, configStream, "utf-8");
    configStream.close();

    GM_log("config saved.")
  
    // now, load config normally and reinitialize all scripts's filenames
    var config = new Config(GM_getPointThreeScriptFile("config.xml"));
    config.load();
  
    GM_log("config reloaded, moving files.");

    for (var i = 0; (script = config.scripts[i]); i++) {  
      if (script.filename.match(/^\d+$/)) {
        scriptFile = GM_getPointThreeScriptFile(script.filename);
        config.initFilename(script);
        GM_log("renaming script " + scriptFile.leafName + " to " + script.filename);
        scriptFile.moveTo(scriptFile.parent, script.filename);
      }
    }
  
    GM_log("moving complete. saving configuration.")
  
    // save the config file
    config.save();
  
    GM_log("0.3 migration completed successfully!")
  } catch (e) {
    alert("Could not complete Greasemonkey 0.3 migration. Some changes may " + 
          "have been made to your scripts directory. See JS Console for " + 
          "error details.\n\nA backup of your old scripts directory is at: " + 
          tempDir.path);
    throw e;
  } finally {
    GM_log("< GM_pointThreeMigrate");
  }
}

function GM_versionIsGreaterOrEqual(v1, v2) {
  v1 = v1.split(".");
  v2 = v2.split(".");

  if (v1[0] == "") v1[0] = "0";
  if (v2[0] == "") v2[0] = "0";

  while (v1.length < v2.length) {
    v1.push("0");
  }
  
  while (v2.length < v1.length) {
    v2.push("0");
  }
  
  var diff;
  for (var i = 0; i < v1.length; i++) {
    diff = parseInt(v1[i]) - parseInt(v2[i]);
    
    if (diff != 0) {
      return diff > 0;
    } else {
      continue;
    }
  }
  
  return 0;
}

function GM_getPointThreeScriptDir() {
  var file = getContentDir();
  file.append("scripts");
  return file;
}

function GM_getPointThreeScriptFile(fileName) {
  var file = GM_getPointThreeScriptDir();
  file.append(fileName);
  return file;
}
