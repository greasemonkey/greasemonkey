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

function ScriptDownloader(url) {
  GM_log("> ScriptDownloader");
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
    GM_log("> ScriptDownloader.start");
    try {
      // This is actually bad, we should be using interface IDs. 
      if(dm.addDownload.length == 8) {
        // ff 1.0.x
        dm.addDownload(0, sourceUri, targetUri, parseScriptName(sourceUri), null, null, null, persist)
      } else if (dm.addDownload.length == 9) {
        // ff 1.1.x
        dm.addDownload(0, sourceUri, targetUri, parseScriptName(sourceUri), null, null, null, null, persist)
      } else {
        // seamonkey
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
    GM_log("< ScriptDownloader.start");
  }

  function checkLoad() {
    GM_log("> ScriptDownloader.checkLoad");
    // if the download is complete, stop.
    if (download.percentComplete == 100) {
      window.clearInterval(timerId);
      handleLoad();
    }
    // if not complete yet, double-check that somebody hasn't cancelled it
    else if (dm.getDownload(targetFile.path) == null) {
      // the download is no longer active
      window.clearInterval(timerId);
      GM_log("* download cancelled, exiting");
      return;
    }
    // otherwise, do nothing. downloading continues.
    GM_log("< ScriptDownloader.checkLoad");
  }

  function handleLoad() {
    GM_log("> ScriptDownloader.handleLoad");
    closeDownloadManager();

    // validate that we downloaded ok
    if (!targetFile.exists() || targetFile.fileSize == 0) {
      alert("The file does not exist or was removed.");
      GM_log("* downloaded file not found, exiting");
      return;
    }

    // initialize a new script object
    var script = new Script();
    script.filename = targetFile.leafName;
    script.enabled = true;
    script.includes = [];
    script.excludes = [];
    
    // crack open the file so we can look for metadata in the comments
    var txt = getContents(targetUri.spec);

    // read one line at a time looking for start meta delimiter or EOF
    var lines = txt.match(/.+/g);
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

    // open install dialog
    result = {};
    GM_log("* opening install dialog");
    window.openDialog("chrome://greasemonkey/content/install.xul", 
      "manager", "resizable,centerscreen,modal", script, targetFile, result);

    if (result.value) {
      alert("Success! Refresh page to see changes.");
    }
    GM_log("< ScriptDownloader.handleLoad");
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
  GM_log("< ScriptDownloader");
}


