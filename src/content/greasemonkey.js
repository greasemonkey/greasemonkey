const GUID = "{e4a8a97b-f2ed-450b-b12d-ee082ba24781}";
const NAMESPACE = "http://youngpup.net/greasemonkey";

function CommandManager() {
  var nextDocId = 1;
  var docIdsInUse = [];
  var docMenuCommands = {};
  
  this.loadDoc = function(e) {
    var docId;
    var document = e.originalTarget;

    if (!document.__gmId) {
      document.__gmId = nextDocId++;
    }

    docMenuCommands[document.__gmId] = 
      window.document.createElement('menupopup');
    
    //enclose the docId to register on.
    //simplifies API, and disallows registering commands on a doc other 
    //than the one the script's on.
    docId = document.__gmId;
    
    e.explicitOriginalTarget.defaultView.GM_registerMenuCommand = 
      function(commandName, commandCallback, accel, access) { 
        registerMenuCommand(docId, commandName, commandCallback, accel, access, e.explicitOriginalTarget.defaultView);
      }; 
  }
  
  this.unloadDoc = function(e) {
    var doc = e.originalTarget;

    if (doc && doc.__gmId) {
      delete docMenuCommands[doc.__gmId];
    }
  }
        
  this.initToolsMenu = function(commandMenu) {
    var doc = getActiveDocument();

    if (commandMenu.firstChild == docMenuCommands[doc.__gmId]) {
      return;
    }

    //show only the popup that's appropriate.
    if (commandMenu.firstChild) {
      commandMenu.removeChild(commandMenu.firstChild);
    }

    var commandPopup = docMenuCommands[doc.__gmId];

    if (commandPopup) {
      commandMenu.appendChild(commandPopup);
    
      var menuItems = commandPopup.childNodes;
      for (var i = 0; i < menuItems.length; i++) {
        //couldn't just add listeners when the popup was created 
        //because removing the popup removes all listeners as well.
        menuItems[i].addEventListener("command", 
          menuItems[i].__gmCommandFunc, false);
      }
      
      commandMenu.setAttribute("disabled", 
        commandPopup.childNodes.length == 0);
    }
      
  } //end initToolsMenus
  
  // last param is a hack to figure out where to attach the event listener. should be improved
  function registerMenuCommand(docId, commandName, commandFunc, accel, access, where) {
    var menuItem;
    var previousItems;
    menuItem = window.document.createElement('menuitem');
    menuItem.setAttribute("label", commandName);
    if( access ) {
      menuItem.setAttribute("accesskey", access);
    }
    menuItem.__gmCommandFunc = function(e) {commandFunc()};
    //menuItem.addEventListener("command", commandFunc, false);
    previousItems = docMenuCommands[docId].childNodes;
    
    if (accel && typeof(accel.key) == "string")  {
      var accelText = "";
      if (accel.accel) {
        accelText += "<accel> + ";
        accel.accel = true;
      } else {
        accel.accel = false;
      }
      if (accel.ctrl) {
        accelText += "<ctrl> + ";
        accel.ctrl = true;
      } else {
        accel.ctrl = false;
      }
      if (accel.meta) {
        accelText += "<meta> + ";
        accel.meta = true;
      } else {
        accel.meta = false;
      }
      if (accel.shift) {
        accelText += "<shift> + ";
        accel.shift = true;
      } else {
        accel.shift = false;
      }
      if (accel.alt) {
        accelText += "<alt> + ";
        accel.alt = true;
      } else {
        accel.alt = false;
      }
      accelText += accel.key;
      
      menuItem.setAttribute("acceltext", accelText);
      var tmpFunc = function(e){
          if (/*(e.accelKey == accel.accel) &&*/
              (e.ctrlKey == accel.ctrl) &&
              (e.metaKey == accel.meta) &&
              (e.shiftKey == accel.shift) &&
              (e.altKey == accel.alt) &&
              (String.fromCharCode(e.which) == accel.key)) {
            commandFunc();
          }
        }
      where.removeEventListener("keypress", tmpFunc, false);
      where.addEventListener("keypress", tmpFunc, false);
    }
    
    var i=0;
    var nextNode=null;

    while (i < previousItems.length) {
      if (commandName.toLowerCase() < 
          previousItems[i].getAttribute('label').toLowerCase()) 
      {
        nextNode = previousItems[i];
        break;
      }
      i++;
    }

    docMenuCommands[docId].insertBefore(menuItem, nextNode);
  }

  
  function getActiveDocument() {
    var tabbrowser = ge("content");
    return tabbrowser.selectedBrowser.contentDocument;
  }
}

function Config() {
  this.onload = null;
  this.scripts = null;

  this.find = function(namespace, name) {
    namespace = namespace.toLowerCase();
    name = name.toLowerCase();

    for (var i = 0, script = null; (script = this.scripts[i]); i++) {
      if (script.namespace.toLowerCase() == namespace && script.name.toLowerCase() == name) {
        return i;
      }
    }

    return -1;
  }
  
  this.initFilename = function(script) {
    var index = {};
    var base = script.name.replace(/[^A-Z0-9_]/gi, "").toLowerCase();

    // 24 is a totally arbitrary max length
    if (base.length > 24) {
      base = base.substring(0, 24);
    }
    
    for (var i = 0; i < this.scripts.length; i++) {
      index[this.scripts[i].filename] = this.scripts[i];
    }
    
    if (!index[base + ".user.js"]) {
      script.filename = base + ".user.js";
      return;
    }
    
    for (var count = 1; count < Number.MAX_VALUE; count++) {
      if (!index[base + count + ".user.js"]) {
        script.filename = base + count + ".user.js";
        return;
      }
    }
    
    throw new Error("doooooooode. get some different user script or something.");
  }
  
  this.load = function() {
    var doc = document.implementation.createDocument("", "", null);
    doc.async = false;
    try {
        doc.load(getScriptChrome("config.xml"));
    } catch (exc) {
        doc.load(getScriptChrome("default-config.xml"));
    }

    var nodes = document.evaluate("/UserScriptConfig/Script", doc, null, 0, null);

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

  this.save = function() {
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

    var configStream = getWriteStream(getScriptFile("config.xml"));
    new XMLSerializer().serializeToStream(doc, configStream, "utf-8");
    configStream.close();
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

function ScriptDownloader(url) {
  var dm = Components.classes["@mozilla.org/download-manager;1"].getService(Components.interfaces.nsIDownloadManager)
  var ioservice = Components.classes["@mozilla.org/network/io-service;1"].getService();
  var sourceUri = null;
  var targetFile = getTempFile();
  var targetUri = null;
  var persist = makeWebBrowserPersist();  
  var sysListener = null;
  var download = null;
  var self = this;
  var timerId = null;

  // io-service isn't available in Seamonkey, but makeURL and makeFileURL are
  if(ioservice.newURI && ioservice.newFileURI ) {
    sourceUri = ioservice.newURI(url, null, null);
    targetUri = ioservice.newFileURI(targetFile);
  } else {
    sourceUri = makeURL(url);
    targetUri = makeFileURL(targetFile)
  }

  this.start = function() {
    try {
      if(dm.addDownload.length == 8) {
       dm.addDownload(0, sourceUri, targetUri, parseScriptName(sourceUri), null, null, null, persist)
      } else {
        dm.addDownload(sourceUri, targetUri, parseScriptName(sourceUri), null, null, persist);
      }

      download = dm.getDownload(targetFile.path);
      try {
        dm.open(window._content, targetFile.path)
      } catch (e) {
        dm.open(window, download)
      }
      persist.progressListener = download;

      persist.saveURI(sourceUri, null, null, null, null, targetFile);

      // this seems like a huge hack, but it was actually the most reliable
      // way I could find to determine when downloading is complete
      timerId = window.setInterval(checkLoad, 200);
    }
    catch (e) {
      handleErrors(e);
    }
  }

  function checkLoad() {
    // if the download is complete, stop.
    if (download.percentComplete == 100) {
      window.clearInterval(timerId);
      handleLoad();
    }
    // if not complete yet, double-check that somebody hasn't cancelled it
    else if (dm.getDownload(targetFile.path) == null) {
      // the download is no longer active
      window.clearInterval(timerId);
      return;
    }
    // otherwise, do nothing. downloading continues.
  }

  function handleLoad() {
    closeDownloadManager();

    // validate that we downloaded ok
    if (!targetFile.exists() || targetFile.fileSize == 0) {
      alert("The file does not exist or was removed.");
      return;
    }

    // initialize a new script object
    var script = new Script();
    script.filename = targetFile.leafName;
    script.enabled = true;
    script.includes = [];
    script.excludes = [];

    // crack open the file so we can look for metadata in the comments
    var fileStream = getLineStream(targetFile);

    // read one line at a time looking for start meta delimiter or EOF
    var lineStream = fileStream.QueryInterface(Components.interfaces.nsILineInputStream);
    var result = {};
    var foundMeta = false;

    while (lineStream.readLine(result)) {
      if (result.value.indexOf("// ==UserScript==") == 0) {
        foundMeta = true;
        break;
      }
    }

    // gather up meta lines
    if (foundMeta) {
      while (lineStream.readLine(result)) {
        if (result.value.indexOf("// ==/UserScript==") == 0) {
          break;
        }

        var match = result.value.match(/\/\/ \@(\S+)\s+([^\n]+)/);
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

    fileStream.close();

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

    // open install dialog
    var result = {};
    window.openDialog("chrome://greasemonkey/content/install.xul", 
      "manager", "resizable,centerscreen,modal", script, targetFile, result);

    if (result.value) {
      alert("Success! Refresh page to see changes.");
    }
  }

  function handleErrors(e) {
    //todo: need to handle this somehow. perhaps nsIUriChecker?
    //if (e.name == "NS_ERROR_FILE_NOT_FOUND") {
    //  alert("User script could not be found. Please check the name and try again.");
    //  window.status = defaultStatus;
    //}
    //else {
      alert("Could not download user script\n\n" + e.toString());
    //}
  }

  function closeDownloadManager() {
    var wm = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator); 
    var en = wm.getEnumerator(""); 
    var n = 0; 
    var dlm = null;
    
    while (en.hasMoreElements()) { 
      var w = en.getNext(); 

      if ((w.location.href == "chrome://mozapps/content/downloads/downloads.xul") ||
          (w.location.href == "chrome://communicator/content/downloadmanager/downloadmanager.xul")) {
        dlm = w;
        break;
      }
    }

    if (dlm != null) {
      dlm.close();
    }
  }
}


function parseScriptName(sourceUri) {
  var name = sourceUri.spec;
  name = name.substring(0, name.indexOf(".user.js"));
  name = name.substring(name.lastIndexOf("/") + 1);
  return name;
}

function getLineStream(file) {
  var fileStream = Components.classes["@mozilla.org/network/file-input-stream;1"]
          .createInstance(Components.interfaces.nsIFileInputStream);

  fileStream.init(file, 1, 0, false);

  return fileStream.QueryInterface(Components.interfaces.nsILineInputStream);
}

function getTempFile() {
  var file = Components.classes["@mozilla.org/file/directory_service;1"]
        .getService(Components.interfaces.nsIProperties)
        .get("TmpD", Components.interfaces.nsILocalFile);

  file.append("gm_" + new Date().getTime());

  return file;
}

function getContents(aURL, charset){
  if( !charset ) {
    charset = "UTF-8"
  }
  var ioService=Components.classes["@mozilla.org/network/io-service;1"]
    .getService(Components.interfaces.nsIIOService);
  var scriptableStream=Components
    .classes["@mozilla.org/scriptableinputstream;1"]
    .getService(Components.interfaces.nsIScriptableInputStream);
  // http://lxr.mozilla.org/mozilla/source/intl/uconv/idl/nsIScriptableUConv.idl
  var unicodeConverter = Components
    .classes["@mozilla.org/intl/scriptableunicodeconverter"]
    .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
  unicodeConverter.charset = charset;

  var channel=ioService.newChannel(aURL,null,null);
  var input=channel.open();
  scriptableStream.init(input);
  var str=scriptableStream.read(input.available());
  scriptableStream.close();
  input.close();
  return unicodeConverter.ConvertToUnicode( str );
}

function getWriteStream(file) {
  var stream = Components.classes["@mozilla.org/network/file-output-stream;1"]
    .createInstance(Components.interfaces.nsIFileOutputStream);

  stream.init(file, 0x02 | 0x08 | 0x20, 420, 0);

  return stream;
}

function getScriptChrome(fileName) {
  return "chrome://greasemonkey/content/scripts/" + fileName;
}

function getScriptFile(fileName) {
  var file = getScriptDir();
  file.append(fileName);
  return file;
}

function getScriptDir() {
  var file = getContentDir();
  file.append("scripts");
  return file;
}

function getContentDir() {
  var file = Components.classes["@mozilla.org/file/directory_service;1"]
        .getService(Components.interfaces.nsIProperties)
        .get("ProfD", Components.interfaces.nsILocalFile);

  // Seamonkey case
  file.append("chrome");
  file.append("greasemonkey");
  file.append("content");

  if( file.exists() ) {
    return file;
  } else {
    // Firefox case
    file = Components.classes["@mozilla.org/file/directory_service;1"]
          .getService(Components.interfaces.nsIProperties)
          .get("ProfD", Components.interfaces.nsILocalFile);

    file.append("extensions");
    file.append(GUID);
    file.append("chrome");
    file.append("greasemonkey");
    file.append("content");

    return file
  }

}

/**
 * Takes the place of the traditional prompt() function which became broken
 * in FF 1.0.1. :(
 */
function gmPrompt(msg, defVal, title) {
  var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]       .getService(Components.interfaces.nsIPromptService);
  var result = {value:defVal};
  
  if (promptService.prompt(null, title, msg, result, null, {value:0})) {
    return result.value;
  }
  else {
    return null;
  }
}

function ge(id) {
    return window.document.getElementById(id);
}

function ge_multi(id, tagName) {
    var elms = window.document.getElementsByTagName(tagName);
    var ret = [];
    for( var i = 0; i < elms.length; i++ ) {
      if( elms[i].getAttribute( "id" ) == id ) {
        ret.push( elms[i] );
      }
    }
    return ret;
}


function GM_log(aMessage, level) {
  // TODO: -make a GM category
  //       -record script name
  var consoleService = Components.classes["@mozilla.org/consoleservice;1"]        .getService(Components.interfaces.nsIConsoleService);
  // level == 0 or not present means info
  // otherwise, create a ScriptError and map level to it's flag values
  if (level) {
    if (level == 1) {
      // warning
      level = 1;
    } else /*if (level == 2)*/ {
      // error - currently fallback
      level = 0;
    }
    var consoleError = Components.classes["@mozilla.org/scripterror;1"]      .createInstance(Components.interfaces.nsIScriptError);    consoleError.init(aMessage, null, null, 0, 0, level, "XUL javascript");    consoleService.logMessage(consoleError);
  } else {    consoleService.logStringMessage(aMessage);
  }
}

function dbg(o) {
  var s = "";
  var i = 0;

  for (var p in o) {
    s += p + ":" + o[p] + "\n";

    if (++i % 15 == 0) {
      alert(s);
      s = "";
    }
  }

  alert(s);
}

function delaydbg(o) {
    setTimeout(function() {dbg(o);}, 1000);
}

function delayalert(s) {
    setTimeout(function() {alert(s);}, 1000);
}
