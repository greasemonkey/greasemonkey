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

// GM_DocHandlers are created by GM_BrowserUI to process individual documents
// loaded into the content area.

function GM_DocHandler(contentWindow, chromeWindow) {
  GM_log("> GM_DocHandler")

  this.contentWindow = contentWindow;
  this.chromeWindow = chromeWindow;

  this.initScripts();
  this.injectScripts();

  GM_log("< GM_DocHandler")
}

GM_DocHandler.prototype.initScripts = function() {
  GM_log("> GM_DocHandler.initScripts");
  
  var config = new Config();
  config.load();
  
  this.scripts = [];

  outer:
  for (var i = 0; i < config.scripts.length; i++) {
    var script = config.scripts[i];

    if (script.enabled) {
      for (var j = 0; j < script.includes.length; j++) {
        var pattern = convert2RegExp(script.includes[j]);

        if (pattern.test(this.contentWindow.location.href)) {
          for (var k = 0; k < script.excludes.length; k++) {
            pattern = convert2RegExp(script.excludes[k]);
  
            if (pattern.test(this.contentWindow.location.href)) {
              continue outer;
            }
          }

          this.scripts.push(script);

          continue outer;
        }
      }
    }
  }

  GM_log("* number of matching scripts: " + this.scripts.length);
  GM_log("< GM_DocHandler.initScripts");
}

GM_DocHandler.prototype.injectScripts = function() {
  GM_log("> GM_DocHandler.injectScripts")

  // trying not to keep to much huge state hanging around, just to avoid
  // stupid mistakes that would leak memory. So not making any of the API
  // objects instance data until it is necessary to do so.
  
  // GM_registerMenuCommand and GM_xmlhttpRequest are the same for every
  // script so we instance them here, before the loop.
  var xmlhttpRequester = new GM_xmlhttpRequester(this.contentWindow, 
                                                 this.chromeWindow);
  this.menuCommander = new GM_MenuCommander(this.contentWindow);
  var xmlhttpRequest = GM_hitch(xmlhttpRequester, "contentStartRequest");
  var registerMenuCommand = GM_hitch(this.menuCommander, 
                                     "registerMenuCommand");
  
  for (var i = 0; i < this.scripts.length; i++) {
    var script = this.scripts[i];
    var scriptElm = this.contentWindow.document.createElement("script");
    
    // GM_setValue, GM_getValue, and GM_log differ for every script, so they
    // need to be instanced for each script.
    var storage = new GM_ScriptStorage(script);
    var logger = new GM_ScriptLogger(script);
    var setValue = GM_hitch(storage, "setValue");
    var getValue = GM_hitch(storage, "getValue");
    var log = GM_hitch(logger, "log");

    // TODO: investigate invoking user scripts with the least possible
    // opportunity for page scripts to interfere -- either by calling GM apis,
    // or by removing or changing user scripts.
    // I imagine that right now, a page script could catch DOMSubtreeModified
    // and remove window.GM_apis.
    
    // TODO: invoke user scripts by embedding a link to a javascript file.
    // This has debugging benefits; when the script errors it shows the right
    // line number.

		//TODO: Add in GM_registerMenuCommand
		var toInject = ["(function(",
		        "GM_xmlhttpRequest, GM_registerMenuCommand, GM_setValue, ",
		        "GM_getValue, GM_log, GM_openInTab) { delete window.GM_apis; ",
		        getContents(getScriptChrome(script.filename)),
		        "\n}).apply(this, window.GM_apis);"
		        ].join("");

    this.contentWindow.GM_apis = [xmlhttpRequest,
                                  registerMenuCommand,
        												  setValue,
                                  getValue, 
                                  log,
                                  GM_openInTab];

    GM_log('injecting: ' + toInject);

    scriptElm.appendChild(this.contentWindow.document.
                          createTextNode(toInject));

    this.contentWindow.document.body.appendChild(scriptElm);
    this.contentWindow.document.body.removeChild(scriptElm);

		GM_log("* injected '" + script.name + "'");    

  }

  GM_log("< GM_DocHandler.injectScripts")  
}