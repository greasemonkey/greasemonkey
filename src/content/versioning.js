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
  // this is the last version which has been run at least once
  var initialized = GM_prefRoot.getValue("version");  
  
  // for now, we don't have to do any schmancy version comparisons because
  // we never had versions before.
  if (!initialized) {
    GM_pointThreeMigrate();
  }

  // update the currently initialized version so we don't do this work again.
  GM_prefRoot.setValue("version", "0.4");
}


/**
 * Migrates the configuration directory from the old format to the new one
 */
function GM_pointThreeMigrate() {
  // check to see whether there's any config to migrate
  if (!getScriptFile("config.xml").exists()) {
    return;
  }
  
  GM_log("Starting 0.3 migration...");

  // back up the config directory
  // if an error happens, report it and exit
  try {
    var scriptDir = getScriptDir();
    var tempDir = getTempFile();

    GM_log("script dir: " + scriptDir.path);
    GM_log("temp dir: " + tempDir.path);

    scriptDir.copyTo(tempDir.parent, tempDir.leafName);
  
    // update the format of the config.xml file and move each file
    var script = null;
    var scriptFile = null;
    var doc = document.implementation.createDocument("", "", null);

    // first, load config.xml raw and add the new required filename attribute
    doc.async = false;
    doc.load(getScriptChrome("config.xml"));
  
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
    var configStream = getWriteStream(getScriptFile("config.xml"));
    new XMLSerializer().serializeToStream(doc, configStream, "utf-8");
    configStream.close();

    GM_log("config saved.")
  
    // now, load config normally and reinitialize all scripts's filenames
    var config = new Config();
    config.load();
  
    GM_log("config reloaded, moving files.");

    for (var i = 0; (script = config.scripts[i]); i++) {  
      if (script.filename.match(/^\d+$/)) {
        scriptFile = getScriptFile(script.filename);
        config.initFilename(script);
        GM_log("renaming script " + scriptFile.leafName + " to " + script.filename);
        scriptFile.moveTo(scriptFile.parent, script.filename);
      }
    }
  
    GM_log("moving complete. saving configuration.")
  
    // save the config file
    config.save();
  
    GM_log("0.3 migration completed successfully!")
  }
  catch (e) {
    alert("Could not complete Greasemonkey 0.3 migration. Some changes may " + 
          "have been made to your scripts directory. See JS Console for " + 
          "error details.\n\nA backup of your old scripts directory is at: " + 
          tempDir.path);
    throw e;
  }
}

