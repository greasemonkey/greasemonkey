var GM_consoleService = Components.classes["@mozilla.org/consoleservice;1"]        
                        .getService(Components.interfaces.nsIConsoleService);

/**
 * Utility to create an error message in the log without throwing an error.
 */
function GM_logError(e, opt_warn) {
  var consoleService = Components.classes['@mozilla.org/consoleservice;1']
    .getService(Components.interfaces.nsIConsoleService);

  var consoleError = Components.classes['@mozilla.org/scripterror;1']
    .createInstance(Components.interfaces.nsIScriptError);

  var flags = opt_warn ? 1 : 0;

  consoleError.init(e.message, e.fileName, e.lineNumber, e.lineNumber,
                    e.columnNumber, flags, null);

  consoleService.logMessage(consoleError);
}

function GM_log(message, force) {
  if (force || GM_prefRoot.getValue("logChrome", false)) {
    GM_consoleService.logStringMessage(message);
  }
}

// TODO: this stuff was copied wholesale and not refactored at all. Lots of
// the UI and Config rely on it. Needs rethinking.

function openInEditor(aFile, win) {
  var editor, editorPath;
  try {
    editorPath = GM_prefRoot.getValue("editor");
  } catch(e) {
    GM_log( "Failed to get 'editor' value:" + e );
    if (GM_prefRoot.exists("editor")) {
      GM_log("A value for 'editor' exists, so let's remove it because it's causing problems");
      GM_prefRoot.remove("editor");
    }
    editorPath = false;
  }
  if (editorPath) {
    // check whether the editor path is valid
    GM_log("Try editor with path " + editorPath);
    editor = Components.classes["@mozilla.org/file/local;1"]
        .createInstance(Components.interfaces.nsILocalFile);
    editor.followLinks = true;
    editor.initWithPath(editorPath);
  } else {
    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var filePicker = Components.classes["@mozilla.org/filepicker;1"]
      .createInstance(nsIFilePicker);
    
    filePicker.init(win, win.document.getElementById('gm-manage-bundle').getString('editor.prompt'), nsIFilePicker.modeOpen);
    filePicker.appendFilters(nsIFilePicker.filterApplication);
    filePicker.appendFilters(nsIFilePicker.filterAll);
    
    if (filePicker.show() != nsIFilePicker.returnOK) {
      return false;
    }
    editor = filePicker.file;
    GM_log("User selected: " + editor.path);
    GM_prefRoot.setValue("editor", editor.path);
  }

  if (editor.exists() && editor.isExecutable()) {
    try {
      GM_log("launching ...");
      
      var mimeInfoService = Components
        .classes["@mozilla.org/uriloader/external-helper-app-service;1"]
        .getService(Components.interfaces.nsIMIMEService);
      var mimeInfo = mimeInfoService
        .getFromTypeAndExtension( "application/x-userscript+javascript", "user.js" );
      mimeInfo.preferredAction = mimeInfo.useHelperApp
      mimeInfo.preferredApplicationHandler = editor;
      mimeInfo.launchWithFile( aFile );
      return true;
    } catch (e) {
      GM_log("Failed to launch editor: " + e, true);
    }
  } else {
    GM_log("Editor '" + editorPath + "' does not exist or isn't executable. " +
           "Put it back, check the permissions, or just give up and reset " +
           "editor using about:config", true)
  }
  return false;
}

function parseScriptName(sourceUri) {
  var name = sourceUri.spec;
  name = name.substring(0, name.indexOf(".user.js"));
  name = name.substring(name.lastIndexOf("/") + 1);
  return name;
}

function gmPrompt(msg, defVal, title) {
  var promptService = Cc["@mozilla.org/embedcomp/prompt-service;1"]       
                        .getService(Ci.nsIPromptService);
  var result = {value:defVal};
  
  if (promptService.prompt(null, title, msg, result, null, {value:0})) {
    return result.value;
  }
  else {
    return null;
  }
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

  var channel=ioService.newChannelFromURI(aURL);
  var input=channel.open();
  scriptableStream.init(input);
  var str=scriptableStream.read(input.available());
  scriptableStream.close();
  input.close();

  try {
    return unicodeConverter.ConvertToUnicode(str);
  } catch( e ) {
    return str;
  }
}

function getWriteStream(file) {
  var stream = Components.classes["@mozilla.org/network/file-output-stream;1"]
    .createInstance(Components.interfaces.nsIFileOutputStream);

  stream.init(file, 0x02 | 0x08 | 0x20, 420, -1);

  return stream;
}

function getScriptFileURI(fileName) {
  return Components.classes["@mozilla.org/network/io-service;1"]
                   .getService(Components.interfaces.nsIIOService)
                   .newFileURI(getScriptFile(fileName));
}

function getScriptFile(fileName) {
  var file = getScriptDir();
  file.append(fileName);
  return file;
}

function getScriptDir() {
  var dir = getNewScriptDir();

  if (dir.exists()) {
    return dir;
  } else {
    return getOldScriptDir();
  }
}

function getNewScriptDir() {
  var file = Components.classes["@mozilla.org/file/directory_service;1"]
                       .getService(Components.interfaces.nsIProperties)
                       .get("ProfD", Components.interfaces.nsILocalFile);
  file.append("gm_scripts");
  return file;
}

function getOldScriptDir() {
  var file = getContentDir();
  file.append("scripts");
  return file;
}

function getContentDir() {
  var reg = Components.classes["@mozilla.org/chrome/chrome-registry;1"]
                      .getService(Components.interfaces.nsIChromeRegistry);

  var ioSvc = Components.classes["@mozilla.org/network/io-service;1"]
                        .getService(Components.interfaces.nsIIOService);

  var proto = Components.classes["@mozilla.org/network/protocol;1?name=file"]
                        .getService(Components.interfaces.nsIFileProtocolHandler);

  var chromeURL = ioSvc.newURI("chrome://greasemonkey/content", null, null);
  var fileURL = reg.convertChromeURL(chromeURL);
  var file = proto.getFileFromURLSpec(fileURL.spec).parent;

  return file
}

function alert(msg) {
  Cc["@mozilla.org/embedcomp/prompt-service;1"]
    .getService(Ci.nsIPromptService)
    .alert(null, "Greasemonkey", msg);
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

function GM_isGreasemonkeyable(url) {
  var scheme = Components.classes["@mozilla.org/network/io-service;1"]
               .getService(Components.interfaces.nsIIOService)
               .extractScheme(url);

  return (scheme == "http" || scheme == "https" || scheme == "file") &&
         !/hiddenWindow\.html$/.test(url);
}

function GM_isFileScheme(url) {
  var scheme = Components.classes["@mozilla.org/network/io-service;1"]
               .getService(Components.interfaces.nsIIOService)
               .extractScheme(url);

  return scheme == "file";
}

function GM_getEnabled() {
  return GM_prefRoot.getValue("enabled", true);
}

function GM_setEnabled(enabled) {
  GM_prefRoot.setValue("enabled", enabled);
}


/**
 * Logs a message to the console. The message can have python style %s 
 * thingers which will be interpolated with additional parameters passed.
 */
function log(message) {
  if (GM_prefRoot.getValue("logChrome", false)) {
    logf.apply(null, arguments);
  }
}

function logf(message) {
  for (var i = 1; i < arguments.length; i++) {
    message = message.replace(/\%s/, arguments[i]);
  }

  dump(message + "\n");
}

/**
 * Loggifies an object. Every method of the object will have it's entrance, 
 * any parameters, any errors, and it's exit logged automatically.
 */
function loggify(obj, name) {
  for (var p in obj) {
    if (typeof obj[p] == "function") {
      obj[p] = gen_loggify_wrapper(obj[p], name, p);
    }
  }
}

function gen_loggify_wrapper(meth, objName, methName) {
return function() {
     var retVal;
    //var args = new Array(arguments.length);
    var argString = "";
    for (var i = 0; i < arguments.length; i++) {
      //args[i] = arguments[i];
      argString += arguments[i] + (((i+1)<arguments.length)? ", " : "");
    }
    
    log("> %s.%s(%s)", objName, methName, argString);//args.join(", "));
    
    try {
      return retVal = meth.apply(this, arguments);
    } finally {
      log("< %s.%s: %s", 
          objName, 
          methName, 
          (typeof retVal == "undefined" ? "void" : retVal));
    }
  }
}