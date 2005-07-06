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
  source.addEventListener(event, listener, opt_capture);
}

function GM_log(message, force) {
  if (force || GM_prefRoot.getValue("logChrome", false)) {
    GM_consoleService.logStringMessage(message);
  }
}

// TODO: this stuff was copied wholesale and not refactored at all. Lots of
// the UI and Config rely on it. Needs rethinking.

function ensureWindowsAssoc() {
  if (navigator.userAgent.match(/\bwindows\b/i) && 
      !new GM_PrefManager().getValue("warnedWindowsEditor")) 
  {
    alert("Hello! Looks like you're on Windows and that this is the your " +
          "first time editing a user script.\n\nTake this opportunity " +
          "to verify that you have associated either the .user.js or " +
          "the .js extension with a text editor on your computer. " + 
          "Otherwise, you may get funny errors.\n\nWhen you're done, " + 
          "come back here and press OK.");

    prefMan.setValue("warnedWindowsEditor", true);
  }
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

  return unicodeConverter.ConvertToUnicode(str);
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
