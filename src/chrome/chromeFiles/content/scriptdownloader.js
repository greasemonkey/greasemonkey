function ScriptDownloader(browser) {
  this.browser = browser;
  bindMethods(this);
}

ScriptDownloader.prototype.installFromURL = function(url) {
  this.browser.showStatus("Downloading user script...");

  this.xhr = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
               .getService(Ci.nsIXMLHttpRequest)
               .QueryInterface(Ci.nsIJSXMLHttpRequest);

  this.url = url;

  try {
    this.xhr.open("GET", url);
    this.xhr.onload = this.installFromURLSuccess;
    this.xhr.onerror = this.installFromURLFailure;
    this.xhr.send(null);
  }
  catch (e) {
    this.installFromURLFailure(e);
  }
}

ScriptDownloader.prototype.installFromURLFailure = function(e) {
  alert("Could not download user script\n\n" + e.toString());
  this.browser.hideStatus();
}
  
ScriptDownloader.prototype.installFromURLSuccess = function() {
  this.installFromSource(this.xhr.responseText, this.url);
}

ScriptDownloader.prototype.installFromSource = function(source, url) {
  var ioservice = Components.classes["@mozilla.org/network/io-service;1"]
                            .getService(Ci.nsIIOService);
  var sourceUri = ioservice.newURI(url, null, null);

  try {
    var targetFile = getTempFile();
    var writeStream = getWriteStream(targetFile);

    writeStream.write(source, source.length);
    writeStream.close();

    // initialize a new script object
    var script = new Script();
    script.filename = targetFile.leafName;
    script.enabled = true;
    script.includes = [];
    script.excludes = [];
    
    // read one line at a time looking for start meta delimiter or EOF
    var lines = source.match(/.+/g);
    var lnIdx = 0;
    var result = {};
    var foundMeta = false;

    while (result = lines[lnIdx++]) {
      if (result.indexOf("// ==UserScript==") == 0) {
        GM_log("* found metadata");
        foundMeta = true;
        break;
      }
    }

    // gather up meta lines
    if (foundMeta) {
      while (result = lines[lnIdx++]) {
        if (result.indexOf("// ==/UserScript==") == 0) {
          break;
        }

        var match = result.match(/\/\/ \@(\S+)\s+([^\n]+)/);
        if (match != null) {
          switch (match[1]) {
            case "name":
            case "namespace":
            case "description":
              script[match[1]] = match[2];
              break;
            case "include":
            case "exclude":
              script[match[1]+"s"].push(match[2]);
              break;
          }
        }
      }
    }

    // if no meta info, default to reasonable values
    if (script.name == null) {
      script.name = parseScriptName(sourceUri);
    }

    if (script.namespace == null) {
      script.namespace = sourceUri.host;
    }

    if (script.includes.length == 0) {
      script.includes.push("*");
    }

    var config = new Config(getScriptFile("config.xml"));

    config.load();

    var newDir = getScriptDir();
    var existingIndex = config.find(script.namespace, script.name);
    var existingFile = null;
    var oldScripts = new Array(config.scripts);

    if (existingIndex > -1) {
      existingFile = getScriptFile(config.scripts[existingIndex].filename);
      existingFile.remove(false);
      config.scripts.splice(existingIndex, 1);
    }

    try {
      config.initFilename(script);
      targetFile.moveTo(newDir, script.filename)
      config.scripts.push(script);
      config.save();
      this.browser.hideStatus();
      alert(script.filename + " installed successfully.");
    }
    catch (e) {
      config.scripts = oldScripts;
      throw e;
    }
  } catch (e2) {
    alert("Error installing user script:\n\n" + (e2 ? e2 : ""));
    this.browser.hideStatus();
    throw e2;
  }
}
