const GM_GUID = "{e4a8a97b-f2ed-450b-b12d-ee082ba24781}";

// TODO: properly scope this constant
const NAMESPACE = "http://youngpup.net/greasemonkey";

var GM_consoleService = Components.classes["@mozilla.org/consoleservice;1"]
                        .getService(Components.interfaces.nsIConsoleService);

function GM_isDef(thing) {
  return typeof(thing) != "undefined";
};

function GM_hitch(obj, meth) {
  if (!obj[meth]) {
    throw "method '" + meth + "' does not exist on object '" + obj + "'";
  }

  var staticArgs = Array.prototype.splice.call(arguments, 2, arguments.length);

  return function() {
    // make a copy of staticArgs (don't modify it because it gets reused for
    // every invocation).
    var args = staticArgs.concat();

    // add all the new arguments
    for (var i = 0; i < arguments.length; i++) {
      args.push(arguments[i]);
    }

    // invoke the original function with the correct this obj and the combined
    // list of static and dynamic arguments.
    return obj[meth].apply(obj, args);
  };
};

function GM_listen(source, event, listener, opt_capture) {
  Components.lookupMethod(source, "addEventListener")(
    event, listener, opt_capture);
};

function GM_unlisten(source, event, listener, opt_capture) {
  Components.lookupMethod(source, "removeEventListener")(
    event, listener, opt_capture);
};

/**
 * Utility to create an error message in the log without throwing an error.
 */
function GM_logError(e, opt_warn, fileName, lineNumber) {
  var consoleService = Components.classes['@mozilla.org/consoleservice;1']
    .getService(Components.interfaces.nsIConsoleService);

  var consoleError = Components.classes['@mozilla.org/scripterror;1']
    .createInstance(Components.interfaces.nsIScriptError);

  var flags = opt_warn ? 1 : 0;

  // third parameter "sourceLine" is supposed to be the line, of the source,
  // on which the error happened.  we don't know it. (directly...)
  consoleError.init(e.message, fileName, null, lineNumber,
                    e.columnNumber, flags, null);

  consoleService.logMessage(consoleError);
};

function GM_log(message, force) {
  if (force || GM_prefRoot.getValue("logChrome", false)) {
    GM_consoleService.logStringMessage(message);
  }
};

// TODO: this stuff was copied wholesale and not refactored at all. Lots of
// the UI and Config rely on it. Needs rethinking.

function openInEditor(script) {
  var file = getScriptFile(script);
  var stringBundle = Components
    .classes["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .createBundle("chrome://greasemonkey/locale/gm-browser.properties");
  var editor = getEditor(stringBundle);
  if (!editor) {
    // The user did not choose an editor.
    return;
  }

  try {
    launchApplicationWithDoc(editor, file);
  } catch (e) {
    // Something may be wrong with the editor the user selected. Remove so that
    // next time they can pick a different one.
    alert(stringBundle.GetStringFromName("editor.could_not_launch") + "\n" + e);
    GM_prefRoot.remove("editor");
    throw e;
  }
}

function getEditor(stringBundle) {
  var editorPath = GM_prefRoot.getValue("editor");

  if (editorPath) {
    GM_log("Found saved editor preference: " + editorPath);

    var editor = Components.classes["@mozilla.org/file/local;1"]
                 .createInstance(Components.interfaces.nsILocalFile);
    editor.followLinks = true;
    editor.initWithPath(editorPath);

    // make sure the editor preference is still valid
    if (editor.exists() && editor.isExecutable()) {
      return editor;
    } else {
      GM_log("Editor preference either does not exist or is not executable");
      GM_prefRoot.remove("editor");
    }
  }

  // Ask the user to choose a new editor. Sometimes users get confused and
  // pick a non-executable file, so we set this up in a loop so that if they do
  // that we can give them an error and try again.
  while (true) {
    GM_log("Asking user to choose editor...");
    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var filePicker = Components.classes["@mozilla.org/filepicker;1"]
                               .createInstance(nsIFilePicker);

    filePicker.init(window, stringBundle.GetStringFromName("editor.prompt"),
                    nsIFilePicker.modeOpen);
    filePicker.appendFilters(nsIFilePicker.filterApplication);
    filePicker.appendFilters(nsIFilePicker.filterAll);

    if (filePicker.show() != nsIFilePicker.returnOK) {
      // The user canceled, return null.
      GM_log("User canceled file picker dialog");
      return null;
    }

    GM_log("User selected: " + filePicker.file.path);

    if (filePicker.file.exists() && filePicker.file.isExecutable()) {
      GM_prefRoot.setValue("editor", filePicker.file.path);
      return filePicker.file;
    } else {
      alert(stringBundle.GetStringFromName("editor.please_pick_executable"));
    }
  }
}

function launchApplicationWithDoc(appFile, docFile) {
  var xulRuntime = Components.classes["@mozilla.org/xre/app-info;1"]
                             .getService(Components.interfaces.nsIXULRuntime);
  // See Mozilla bug: https://bugzilla.mozilla.org/show_bug.cgi?id=411819
  // TODO: remove this when nsIMIMEInfo works on windows again.
  if (xulRuntime.OS.toLowerCase().substring(0, 3) == "win") {
    var process = Components.classes["@mozilla.org/process/util;1"]
                            .createInstance(Components.interfaces.nsIProcess);
    process.init(appFile);
    process.run(false, // blocking
                [docFile.path], // args
                1); // number of args
  } else {
    var mimeInfoService =
        Components.classes["@mozilla.org/uriloader/external-helper-app-service;1"]
                  .getService(Components.interfaces.nsIMIMEService);
    var mimeInfo = mimeInfoService.getFromTypeAndExtension(
        "application/x-userscript+javascript", "user.js" );
    mimeInfo.preferredAction = mimeInfo.useHelperApp;
    mimeInfo.preferredApplicationHandler = appFile;
    mimeInfo.launchWithFile(docFile);
  }
}

function parseScriptName(sourceUri) {
  var name = sourceUri.spec;
  name = name.substring(0, name.indexOf(".user.js"));
  name = name.substring(name.lastIndexOf("/") + 1);
  return name;
};

function getTempFile() {
  var file = Components.classes["@mozilla.org/file/directory_service;1"]
        .getService(Components.interfaces.nsIProperties)
        .get("TmpD", Components.interfaces.nsILocalFile);

  file.append("gm_" + new Date().getTime() + Math.floor(Math.random()*65536));
  if(file.exists()){
    return getTempFile();
  }

  return file;
};

function getBinaryContents(url){
    var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                              .getService(Components.interfaces.nsIIOService);

    var channel = ioService.newChannelFromURI(url);
    var input = channel.open();

    var bstream = Components.classes["@mozilla.org/binaryinputstream;1"]
                            .createInstance(Components.interfaces.nsIBinaryInputStream);
    bstream.setInputStream(input);

    var bytes = bstream.readBytes(bstream.available());

    return bytes;
};

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
};

function getWriteStream(file) {
  var stream = Components.classes["@mozilla.org/network/file-output-stream;1"]
                         .createInstance(Components.interfaces.nsIFileOutputStream);

  stream.init(file, 0x02 | 0x08 | 0x20, 420, -1);

  return stream;
};

function getConfigFile(){
  var file = getScriptDir();
  file.append("config.xml");
  return file;
};

function getConfigFileURI(){
  return Components.classes["@mozilla.org/network/io-service;1"]
                   .getService(Components.interfaces.nsIIOService)
                   .newFileURI(getConfigFile());
};

function getDependencyFileURI(script, dep){
  return Components.classes["@mozilla.org/network/io-service;1"]
                   .getService(Components.interfaces.nsIIOService)
                   .newFileURI(getDependencyFile(script, dep));
};

function getDependencyFile(script, dep){
  var file = getScriptDir();
  file.append(script.basedir);
  file.append(dep.filename);
  return file;
};

function getScriptFileURI(script) {
  return Components.classes["@mozilla.org/network/io-service;1"]
                   .getService(Components.interfaces.nsIIOService)
                   .newFileURI(getScriptFile(script));
};

function getScriptBasedir(script) {
  var file = getScriptDir();
  file.append(script.basedir);
  return file;
};

function getScriptFile(script) {
  var file = getScriptDir();
  file.append(script.basedir);
  file.append(script.filename);
  return file;
};

function getScriptDir() {
  var dir = getNewScriptDir();

  if (dir.exists()) {
    return dir;
  } else {
    var oldDir = getOldScriptDir();
    if (oldDir.exists()) {
      return oldDir;
    } else {
      // if we called this function, we want a script dir.
      // but, at this branch, neither the old nor new exists, so create one
      return GM_createScriptsDir(dir);
    }
  }
};

function getNewScriptDir() {
  var file = Components.classes["@mozilla.org/file/directory_service;1"]
                       .getService(Components.interfaces.nsIProperties)
                       .get("ProfD", Components.interfaces.nsILocalFile);
  file.append("gm_scripts");
  return file;
};

function getOldScriptDir() {
  var file = getContentDir();
  file.append("scripts");
  return file;
};

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
};

/**
 * Compares two version numbers
 *
 * @param {String} aV1 Version of first item in 1.2.3.4..9. format
 * @param {String} aV2 Version of second item in 1.2.3.4..9. format
 *
 * @returns {Int}  1 if first argument is higher
 *                 0 if arguments are equal
 *                 -1 if second argument is higher
 */
function GM_compareVersions(aV1, aV2) {
  var v1 = aV1.split(".");
  var v2 = aV2.split(".");
  var numSubversions = (v1.length > v2.length) ? v1.length : v2.length;

  for (var i = 0; i < numSubversions; i++) {
    if (typeof v2[i] == 'undefined') {
      return 1;
    }

    if (typeof v1[i] == 'undefined') {
      return -1;
    }

    if (parseInt(v2[i], 10) > parseInt(v1[i], 10)) {
      return -1;
    } else if (parseInt(v2[i], 10) < parseInt(v1[i], 10)) {
      return 1;
    }
  }

  // v2 was never higher or lower than v1
  return 0;
}

/**
 * Takes the place of the traditional prompt() function which became broken
 * in FF 1.0.1. :(
 */
function gmPrompt(msg, defVal, title) {
  var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                .getService(Components.interfaces.nsIPromptService);
  var result = {value:defVal};

  if (promptService.prompt(null, title, msg, result, null, {value:0})) {
    return result.value;
  }
  else {
    return null;
  }
};

function ge(id) {
  return window.document.getElementById(id);
};


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
};

function delaydbg(o) {
  setTimeout(function() {dbg(o);}, 1000);
};

function delayalert(s) {
  setTimeout(function() {alert(s);}, 1000);
};

function GM_isGreasemonkeyable(url) {
  var scheme = Components.classes["@mozilla.org/network/io-service;1"]
               .getService(Components.interfaces.nsIIOService)
               .extractScheme(url);

  return (scheme == "http" || scheme == "https" || scheme == "file" ||
          scheme == "ftp" || url.match(/^about:cache/)) &&
          !/hiddenWindow\.html$/.test(url);
};

function GM_isFileScheme(url) {
  var scheme = Components.classes["@mozilla.org/network/io-service;1"]
               .getService(Components.interfaces.nsIIOService)
               .extractScheme(url);

  return scheme == "file";
};

function GM_getEnabled() {
  return GM_prefRoot.getValue("enabled", true);
};

function GM_setEnabled(enabled) {
  GM_prefRoot.setValue("enabled", enabled);
};


/**
 * Logs a message to the console. The message can have python style %s
 * thingers which will be interpolated with additional parameters passed.
 */
function log(message) {
  if (GM_prefRoot.getValue("logChrome", false)) {
    logf.apply(null, arguments);
  }
};

function logf(message) {
  for (var i = 1; i < arguments.length; i++) {
    message = message.replace(/\%s/, arguments[i]);
  }

  dump(message + "\n");
};

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
};

function gen_loggify_wrapper(meth, objName, methName) {
  return function() {
     var retVal;
    //var args = new Array(arguments.length);
    var argString = "";
    for (var i = 0; i < arguments.length; i++) {
      //args[i] = arguments[i];
      argString += arguments[i] + (((i+1)<arguments.length)? ", " : "");
    }

    log("> %s.%s(%s)", objName, methName, argString); //args.join(", "));

    try {
      return retVal = meth.apply(this, arguments);
    } finally {
      log("< %s.%s: %s",
          objName,
          methName,
          (typeof retVal == "undefined" ? "void" : retVal));
    }
  }
};