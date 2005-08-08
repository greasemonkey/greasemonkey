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

// TODO: properly scope this nastiness
const GUID = "{e4a8a97b-f2ed-450b-b12d-ee082ba24781}";
const NAMESPACE = "http://youngpup.net/greasemonkey";

var GM_consoleService = Components.classes["@mozilla.org/consoleservice;1"]        
                        .getService(Components.interfaces.nsIConsoleService);

function GM_isDef(thing) {
  return typeof(thing) != "undefined";
}

function GM_hitch(obj, meth) {
  if (!obj[meth]) {
    throw "method '" + meth + "' does not exist on object '" + obj + "'";
  }
  
  if (arguments.length > 2) {
    var hitchArgs = [];

    for (var i = 2; i < arguments.length; i++) {
      hitchArgs.push(arguments[i]);
    }

    return function() { return obj[meth].apply(obj, hitchArgs); };
  } else {
    return function() { return obj[meth].apply(obj, arguments); };
  }
}

function GM_listen(source, event, listener, opt_capture) {
  Components.lookupMethod(source, "addEventListener").apply(
    source, [event, listener, opt_capture]);
}

function GM_unlisten(source, event, listener, opt_capture) {
  Components.lookupMethod(source, "removeEventListener").apply(
    source, [event, listener, opt_capture]);
}

/**
 * Utility to create an error message in the log without throwing an error.
 */
function GM_logError(e, force) {
  GM_log("> GM_DocHandler.reportError");

  if (force || GM_prefRoot.getValue("logChrome", false)) {
    var consoleService = Components.classes['@mozilla.org/consoleservice;1']
      .getService(Components.interfaces.nsIConsoleService);

    var consoleError = Components.classes['@mozilla.org/scripterror;1']
      .createInstance(Components.interfaces.nsIScriptError);

    consoleError.init(e.message, e.fileName, e.lineNumber, e.lineNumber,
                      e.columnNumber, 0, null);

    consoleService.logMessage(consoleError);
  }

  GM_log("< GM_DocHandler.reportError");
}

function GM_log(message, force) {
  if (force || GM_prefRoot.getValue("logChrome", false)) {
    GM_consoleService.logStringMessage(message);
  }
}

// TODO: this stuff was copied wholesale and not refactored at all. Lots of
// the UI and Config rely on it. Needs rethinking.

function openInEditor(aFile) {
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
    
    filePicker.init(window, "Find Text Editor", nsIFilePicker.modeOpen);
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

  try {
    return unicodeConverter.ConvertToUnicode(str);
  } catch( e ) {
    return str;
  }
}

function getWriteStream(file) {
  var stream = Components.classes["@mozilla.org/network/file-output-stream;1"]
    .createInstance(Components.interfaces.nsIFileOutputStream);

  stream.init(file, 0x02 | 0x08 | 0x20, 420, 0);

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
  var file = Components.classes["@mozilla.org/file/directory_service;1"]
                       .getService(Components.interfaces.nsIProperties)
                       .get("ProfD", Components.interfaces.nsILocalFile);
  file.append("gm_scripts");
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

function GM_deepWrappersEnabled() {
  // the old school javacript wrappers had this property containing their
  // untrusted variable. the new ones don't.
  return !(new XPCNativeWrapper(window).mUntrustedObject);
}

function GM_isGreasemonkeyable(url) {
  var scheme = Components.classes["@mozilla.org/network/io-service;1"]
               .getService(Components.interfaces.nsIIOService)
               .extractScheme(url);

  return scheme == "http" || scheme == "https" || scheme == "file";
}

function GM_isFileScheme(url) {
  var scheme = Components.classes["@mozilla.org/network/io-service;1"]
               .getService(Components.interfaces.nsIIOService)
               .extractScheme(url);

  return scheme == "file";
}