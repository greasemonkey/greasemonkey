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

function GM_ScriptStorage(script) {
  var namespace = script.namespace;
  
  if (namespace.substring(namespace.length - 1) != "/") {
    namespace += "/";
  }
  
  this.prefMan = new GM_PrefManager(["scriptvals.",
                                     namespace,
                                     "/",
                                     script.name,
                                     "."].join(""));
}

GM_ScriptStorage.prototype.setValue = function(name, val) {
  this.prefMan.setValue(name, val);
}

GM_ScriptStorage.prototype.getValue = function(name, defVal) {
  return this.prefMan.getValue(name, defVal);
}


function GM_ScriptLogger(script) {
  var namespace = script.namespace;
  
  if (namespace.substring(namespace.length - 1) != "/") {
    namespace += "/";
  }
  
  this.prefix = [namespace, script.name, ": "].join("");
}

GM_ScriptLogger.prototype.log = function(message) {
  GM_log(this.prefix + message, true);
}


function GM_openInTab(url) {
  window.setTimeout(function() {
    document.getElementById("content").addTab(url);
  }, 0);
}