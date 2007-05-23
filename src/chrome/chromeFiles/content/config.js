

function Config() {
  this.onload = null;
  this.scripts = null;
  this.configFile = getScriptFile("config.xml");
}

Config.prototype.find = function(namespace, name) {
  namespace = namespace.toLowerCase();
  name = name.toLowerCase();

  for (var i = 0, script = null; (script = this.scripts[i]); i++) {
    if (script.namespace.toLowerCase() == namespace && script.name.toLowerCase() == name) {
      return i;
    }
  }

  return -1;
}

Config.prototype.initFilename = function(script) {
  var index = {};
  var base = script.name.replace(/[^A-Z0-9_]/gi, "").toLowerCase();

  // If no Latin characters found - use default
  if (!base) {
    base = "gm_script";
  }

  // 24 is a totally arbitrary max length
  if (base.length > 24) {
    base = base.substring(0, 24);
  }

  for (var i = 0; i < this.scripts.length; i++) {
    index[this.scripts[i].filename] = this.scripts[i];
  }

  for (var count = 0, filename; count < Number.MAX_VALUE; count++) {
    if (0 == count) {
      filename = base + ".user.js";
    } else {
      filename = base + count + ".user.js";
    }

    if (!index[filename]) {
      // Check to make sure there's no file already in that space.
      var file = getScriptDir().clone();
      file.append(filename);
      if (!file.exists()) {
        script.filename = filename;
        return;
      }
    }
  }

  throw new Error("doooooooode. get some different user script or something.");
}

Config.prototype.load = function() {
  var domParser = Components.classes["@mozilla.org/xmlextras/domparser;1"]
    .createInstance(Components.interfaces.nsIDOMParser);

  var configContents = getContents(getScriptFileURI("config.xml"));
  var doc = domParser.parseFromString(configContents, "text/xml");
  var nodes = doc.evaluate("/UserScriptConfig/Script", doc, null, 0, null);

  this.scripts = [];

  for (var node = null; (node = nodes.iterateNext()); ) {
    var script = new Script();

    for (var i = 0, childNode = null; (childNode = node.childNodes[i]); i++) {
      if (childNode.nodeName == "Include") {
	script.includes.push(childNode.firstChild.nodeValue);
      }
      else if (childNode.nodeName == "Exclude") {
	script.excludes.push(childNode.firstChild.nodeValue);
      }
    }

    script.filename = node.getAttribute("filename");
    script.name = node.getAttribute("name");
    script.namespace = node.getAttribute("namespace");
    script.description = node.getAttribute("description");
    script.enabled = node.getAttribute("enabled") == true.toString();

    this.scripts.push(script);
  }
}

Config.prototype.save = function() {
  var doc = document.implementation.createDocument("", "UserScriptConfig", null);

  for (var i = 0, scriptObj = null; (scriptObj = this.scripts[i]); i++) {
    var scriptNode = doc.createElement("Script");

    for (var j = 0; j < scriptObj.includes.length; j++) {
      var includeNode = doc.createElement("Include");
      includeNode.appendChild(doc.createTextNode(scriptObj.includes[j]));
      scriptNode.appendChild(doc.createTextNode("\n\t\t"));
      scriptNode.appendChild(includeNode);
    }

    for (var j = 0; j < scriptObj.excludes.length; j++) {
      var excludeNode = doc.createElement("Exclude");
      excludeNode.appendChild(doc.createTextNode(scriptObj.excludes[j]));
      scriptNode.appendChild(doc.createTextNode("\n\t\t"));
      scriptNode.appendChild(excludeNode);
    }

    scriptNode.appendChild(doc.createTextNode("\n\t"));

    scriptNode.setAttribute("filename", scriptObj.filename);
    scriptNode.setAttribute("name", scriptObj.name);
    scriptNode.setAttribute("namespace", scriptObj.namespace);
    scriptNode.setAttribute("description", scriptObj.description);
    scriptNode.setAttribute("enabled", scriptObj.enabled);

    doc.firstChild.appendChild(doc.createTextNode("\n\t"));
    doc.firstChild.appendChild(scriptNode);
  }

  doc.firstChild.appendChild(doc.createTextNode("\n"))

  var configStream = getWriteStream(this.configFile);
  new XMLSerializer().serializeToStream(doc, configStream, "utf-8");
  configStream.close();
}

Config.prototype.install = function(script) {
  try {
    // initialize a new script object
    script.filename = script.file.leafName;

    var newDir = getScriptDir();
    var existingIndex = this.find(script.namespace, script.name);
    var existingFile = null;
    var oldScripts = new Array(this.scripts);

    if (existingIndex > -1) {
      existingFile = getScriptFile(this.scripts[existingIndex].filename);

      if (existingFile.exists()) {
        existingFile.remove(false);
      }

      this.scripts.splice(existingIndex, 1);
    }

    try {
      this.initFilename(script);
      script.file.copyTo(newDir, script.filename)
      this.scripts.push(script);
      this.save();
    }
    catch (e) {
      this.scripts = oldScripts;
      throw e;
    }
  } catch (e2) {
    alert("Error installing user script:\n\n" + (e2 ? e2 : ""));
  }
}


function Script() {
  this.filename = null;
  this.name = null;
  this.namespace = null;
  this.description = null;
  this.enabled = true;
  this.includes = [];
  this.excludes = [];
}
