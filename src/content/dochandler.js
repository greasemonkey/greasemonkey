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

const GM_VALID_DEFAULT_DOC_CONTENTS = [
  "<HTML><HEAD/></HTML>",
  ""
  ];
  
GM_VALID_DEFAULT_DOC_CONTENTS.contains = function(str) {
  for (var i = 0; i < this.length; i++) {
    if (this[i] == str) {
      return true;
    }
  }
  
  return false;
}

function GM_DocHandler(unsafeContentWin, chromeWindow, menuCommander, isFile) {
  GM_log("> GM_DocHandler")

  this.unsafeContentWin = unsafeContentWin;
  this.chromeWindow = chromeWindow;
  this.menuCommander = menuCommander;
  this.isFile = isFile;

  // this will be all scripts to be injected into this document.
  this.scripts = [];

  this.loadHandler = GM_hitch(this, "contentLoad");
  GM_listen(this.chromeWindow, "DOMContentLoaded", this.loadHandler);

  if (this.isFile) {
  } else {
    Components.classes["@mozilla.org/docloaderservice;1"]
              .getService(Components.interfaces.nsIWebProgress)
              .addProgressListener(this, 
                                   Components.interfaces.nsIWebProgress
                                                        .NOTIFY_PROGRESS);
  }
            
  GM_log("< GM_DocHandler")
}

/**
 * This object will sometimes get registered with docloaderservice to receive 
 * progress events.
 */
GM_DocHandler.prototype.QueryInterface = function(iid) {
  if (iid.equals(Components.interfaces.nsISupportsWeakReference) ||
      iid.equals(Components.interfaces.nsIWebProgressListener) ||
      iid.equals(Components.interfaces.nsISupports)) {
    return this;
  }
  
  throw Components.results.NS_ERROR_NO_INTERFACE;
}

/**
 * Used as GM_registerMenuCommand for frames, where that function isn't
 * supported
 */
GM_DocHandler.prototype.nullRegisterMenuCommand = function(){}

/**
 * Gets called when the first progress event happens on any window after 
 * instanciation. This is the earliest we could figure to get in and grab a
 * reference to Object for this.evaluator. We need to get in super early to
 * avoid the chance of malicious content changing the definiton of Object
 * before we get to it.
 *
 * Since we're only using this as a way to get in as soon as the document is
 * available, and don't actually care about any additional progress changes, 
 * we immediately unregister as soon as the first matching event occurs.
 */
GM_DocHandler.prototype.onProgressChange = 
function(webProgress, request, stateFlags, aStatus) {
  GM_log("> GM_DocHandler.onProgressChange");
  
  // we're waiting for the first progress event from our DOMWindow 
  if (webProgress.DOMWindow == this.unsafeContentWin) {
    try {
      var unsafeDoc = new XPCNativeWrapper(this.unsafeContentWin, 
                                           "document").document;

      GM_log("*** doc: " + unsafeDoc);

      // sanity check that we got in early enough. 
      var docContent = new XMLSerializer().serializeToString(unsafeDoc);

      GM_log("doc content: " + docContent.substring(0, 100));

      if (!GM_VALID_DEFAULT_DOC_CONTENTS.contains(docContent)) {
        // The document is in some unknown state. Don't get references from it.
        this.reportError(new Error("Invalid document, could not get global " + 
                                   "object.\n" + docContent));
        return;
      } else {
        // It seems safe. Go ahead an snarf a ref to the Object from content.
        this.snarf();
      }
    } finally {
      // we're done - stop listening for events
      Components.classes["@mozilla.org/docloaderservice;1"]
        .getService(Components.interfaces.nsIWebProgress)
        .removeProgressListener(this);
    }
  }

  GM_log("< GM_DocHandler.onProgressChange");
}

/**
 * Called when the DOM we are watching is complete
 */
GM_DocHandler.prototype.contentLoad = function(unsafeEvent) {
  GM_log("> GM_DocHandler.contentLoad");
  
  var unsafeDoc = new XPCNativeWrapper(unsafeEvent, "target").target;
  var unsafeWin = new XPCNativeWrapper(unsafeDoc, "defaultView").defaultView;

  // beacuse of event bubbling, we can actually get DOMContentLoaded from 
  // other frames. Only act on the window that this DocHandler was created 
  // for.
  if (this.unsafeContentWin == unsafeWin) {
    try {
      GM_log("DOMContentLoaded event was from this window. Continuing.. ");

      if (this.isFile) {
        // for file loads, we don't get a progress notification where we can 
        // snarf a trusted object early. I guess that's OK though since it is 
        // a local file we're loading.
        this.snarf();
      } else if (!this.sandboxCtor) {
        throw new Error("Invalid state. Should have had a progress event " + 
                        "and snarfed a sandbox ctor by now.");
      }

      this.initScripts();
      this.injectScripts();
    } finally {
      GM_unlisten(this.chromeWindow, "DOMContentLoaded", this.loadHandler);
    }
  } else {
    GM_log("DOMContentLoaded was not from this window. skipping.")
  }
  
  GM_log("< GM_DocHandler.contentLoad");
}

/**
 * Figure out which scripts to inject by running their patterns against this
 * window's URL
 */
GM_DocHandler.prototype.initScripts = function() {
  GM_log("> GM_DocHandler.initScripts");
  
  var config = new Config(getScriptFile("config.xml"));
  config.load();
  
  var unsafeLoc = new XPCNativeWrapper(this.unsafeContentWin, 
                                       "location").location;
  var url = new XPCNativeWrapper(unsafeLoc, "href").href;

  outer:
  for (var i = 0; i < config.scripts.length; i++) {
    var script = config.scripts[i];
    if (script.enabled) {
      for (var j = 0; j < script.includes.length; j++) {
        var pattern = convert2RegExp(script.includes[j]);

        if (pattern.test(url)) {
          for (var k = 0; k < script.excludes.length; k++) {
            pattern = convert2RegExp(script.excludes[k]);
  
            if (pattern.test(url)) {
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

/**
 * Inject the scripts for this window by evaling them against a sandbox which
 * delegates to content. The sandbox has the GM apis on it. This prevents 
 * content from possibly accessing them. Other than that, it appears to 
 * scripts that they are running in content. Except that variables they 
 * create do not end up as properties of contentWindow.
 */
GM_DocHandler.prototype.injectScripts = function() {
  GM_log("> GM_DocHandler.injectScripts");

  for (var i = 0; i < this.scripts.length; i++) {
    // Arrange for injectScript to be called with the current script in a 
    // split second.
    // We evaluate scripts on a timeout because not doing so caused one
    // strange problem in bloglinesautoload.user.js -- user scripts were not 
    // allowed to change the URL of the content frame. Moving to timeout 
    // solved this.
    this.sandboxSetTimeout.apply(
      this.unsafeContentWin, 
      [GM_hitch(this, "injectScript", this.scripts[i])]);
  }
  
  GM_log("< GM_DocHandler.injectScripts");
}

/**
 * Injects a script into the given sandbox.
 */
GM_DocHandler.prototype.injectScript = function(script) {
  GM_log("> GM_DocHandler.injectScript (" + script.filename + ")");

  // This is the most amazing thing I have ever seen.
  // Multiple statements in the JavaScript interpreter were causing a crash
  // in FF 1.0.x.
  // I described it to Brendan, and, after a bit of thought, he knew right off
  // the top of his head that adding a pointless eval() would fix it. Magic.
  eval("42");

  var sandbox = new this.sandboxCtor();
  var storage = new GM_ScriptStorage(script);
  var logger = new GM_ScriptLogger(script);
  var xmlhttpRequester = new GM_xmlhttpRequester(this.unsafeContentWin, 
                                                 this.chromeWindow);

  sandbox.GM_log = GM_hitch(logger, "log");
  sandbox.GM_setValue = GM_hitch(storage, "setValue");
  sandbox.GM_getValue = GM_hitch(storage, "getValue");
  sandbox.GM_log = GM_hitch(logger, "log");
  sandbox.GM_xmlhttpRequest = GM_hitch(xmlhttpRequester, "contentStartRequest");
  sandbox.GM_openInTab = GM_openInTab;
  sandbox.unsafeWindow = this.unsafeContentWin;

  if (this.menuCommander) {
    sandbox.GM_registerMenuCommand = GM_hitch(this.menuCommander, 
                                              "registerMenuCommand");
  } else {
    sandbox.GM_registerMenuCommand = this.nullRegisterMenuCommand;
  }

  // At first XPCNativeWrappers were not deep. If the deep kind is 
  // available, use it. Otherwise, use the regular non-wrapped objects.
  if (GM_deepWrappersEnabled()) {
    sandbox.window = new XPCNativeWrapper(this.unsafeContentWin);
  } else {
    sandbox.window = this.unsafeContentWin;
  }

  sandbox.__proto__ = this.unsafeContentWin;

  // the wrapper function is just for compatibility with older scripts
  // which used 'return' expecting to live inside a function. Also, 
  // FF crashes without it (but this can be overcome by adding a meaningless
  // eval() at the start of this function -- eg eval('42') -- there is a 
  // compiler bug which this addresses).

  var code = ["var safeWin = window",
              "with (unsafeWindow) {",
              "with (safeWin) {",
              "delete safeWin;",
              "(function(){",
              getContents(getScriptFileURI(script.filename).spec),
              "})()",
              "}",
              "}"]
              .join("\n");

  try {
    // When you eval scripts that have an error, the line number you get
    // back is the line number of the eval() call plus the line number 
    // within the eval'd code. Creating a marker error is just a way to get
    // the line number of the eval() call so that we can subtract it out in
    // the error messages. This only works in DeerPark+.
    var marker = new Error();
    this.sandboxEval.apply(sandbox, [code, sandbox]);
  } catch (e) {
    this.reportError(
      new Error(e.message, 
                script.filename, 
                e.lineNumber ? (e.lineNumber - marker.lineNumber - 5) : 0));
  }
  
  GM_log("< GM_DocHandler.injectScript");
}

/**
 * Grab some clean references out of the content window for later use
 */
GM_DocHandler.prototype.snarf = function() {
  this.sandboxCtor = this.unsafeContentWin.Object;
  this.sandboxEval = this.sandboxCtor.eval;
  this.sandboxSetTimeout = this.unsafeContentWin.setTimeout;
}

/**
 * Utility to create an error message in the log without throwing an error.
 * There seems to be a problem with throwing errors in the consumer of this
 * object -- it always thinks they are null, so we use this to report errors
 * instead.
 */
GM_DocHandler.prototype.reportError = function(e) {
  GM_log("> GM_DocHandler.reportError");

  var consoleService = Components.classes['@mozilla.org/consoleservice;1']
    .getService(Components.interfaces.nsIConsoleService);

  var consoleError = Components.classes['@mozilla.org/scripterror;1']
    .createInstance(Components.interfaces.nsIScriptError);

  consoleError.init(e.message, e.fileName, e.lineNumber, e.lineNumber,
                    e.columnNumber, 0, null);

  consoleService.logMessage(consoleError);

  GM_log("< GM_DocHandler.reportError");
}