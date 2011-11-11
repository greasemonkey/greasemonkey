var EXPORTED_SYMBOLS = ['RemoteScript'];

var Cc = Components.classes;
var Ci = Components.interfaces;

Components.utils.import('resource://greasemonkey/util.js');

// Load in the Script objects, not yet module-ized.
var loader = Cc['@mozilla.org/moz/jssubscript-loader;1']
    .getService(Ci.mozIJSSubScriptLoader);
loader.loadSubScript('chrome://greasemonkey/content/script.js');
loader.loadSubScript('chrome://greasemonkey/content/scriptrequire.js');
loader.loadSubScript('chrome://greasemonkey/content/scriptresource.js');
loader.loadSubScript('chrome://greasemonkey/content/scripticon.js');

var GM_config = GM_util.getService().config;
var ioService = Cc['@mozilla.org/network/io-service;1']
    .getService(Ci.nsIIOService);

/////////////////////////////// Private Helpers ////////////////////////////////

function assertIsFunction(aFunc, aMessage) {
  if (typeof aFunc !== typeof function() {}) throw Error(aMessage);
}

var disallowedFilenameCharacters = new RegExp('[\\\\/:*?\'"<>|]', 'g');
function cleanFilename(aFilename, aDefault) {
  // Blacklist problem characters (slashes, colons, etc.).
  var filename = (aFilename || aDefault).replace(
      disallowedFilenameCharacters, '');
  // Ensure that it's something.
  if (!filename) filename = aDefault || 'unknown';
  return filename;
}

function filenameFromUri(aUri, aDefault) {
  var filename = '';
  try {
    var url = aUri.QueryInterface(Ci.nsIURL);
    filename = url.fileName;
  } catch (e) {
    dump('filenameFromUri error: ' + e + '\n');
  }

  return cleanFilename(filename, aDefault);
}

////////////////////////// Private Progress Listener ///////////////////////////

function ProgressListener(
    aRemoteScript, aCompletionCallback, aProgressCallback) {
  this._remoteScript = aRemoteScript;
  this._completionCallback = aCompletionCallback || function() {};
  this._progressCallback = aProgressCallback || function() {};
}

ProgressListener.prototype.onLocationChange = function(
    aWebProgress, aRequest, aLocation) {
};

ProgressListener.prototype.onProgressChange = function(
    aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress,
    aCurTotalProgress, aMaxTotalProgress) {
  var progress = aCurTotalProgress / aMaxTotalProgress;
  if (-1 == aMaxTotalProgress) progress = 0;

  if (!this._progressCallback(progress)) {
    // The progress callback is where we check for HTML type, and return false
    // if so.  In such a case, immediately complete as a failure.
    this._completionCallback(false, 'any');
  }
};

ProgressListener.prototype.onSecurityChange = function(
    aWebProgress, aRequest, aState) {
};

/** Called at least at the start and stop of the request. */
ProgressListener.prototype.onStateChange = function(
    aWebProgress, aRequest, aStateFlags, aStatus) {
  // Find if there has been any error.
  if (!(aStateFlags & Ci.nsIWebProgressListener.STATE_STOP)) {
    return;
  }
  var error = aStatus !== 0;
  try {
    var httpChannel = aRequest.QueryInterface(Ci.nsIHttpChannel);
    error |= !httpChannel.requestSucceeded;
    error |= httpChannel.responseStatus >= 400;
  } catch (e) {
    try {
      aRequest.QueryInterface(Ci.nsIFileChannel);
      // no-op; if it got this far, aStatus is accurate.
    } catch (e) {
      dump('aRequest is neither http nor file channel: ' + aRequest + '\n');
      for (i in Ci) {
        try {
          aRequest.QueryInterface(Ci[i]);
          dump('it is a: ' + i + '\n');
        } catch (e) {
          // ignore
        }
      }
    }
  }

  // Indicate final progress (complete).
  this._progressCallback(1);
  // Call back with that found error state.
  this._completionCallback(!error);
};

ProgressListener.prototype.onStatusChange = function(
    aWebProgress, aRequest, aStatus, aMessage) {
  // TODO: Better figure out the possible aStatus values.  Docs say:
  // "This interface does not define the set of possible status codes."

  // Manually found when reading an invalid file:/// URL.
  if (2152857618 == aStatus) this._completionCallback(false);
};

/////////////////////////////// Public Interface ///////////////////////////////

// Note: The design of this class is very asynchronous, with the result that
// the code path spaghetti's through quite a few callbacks.  A necessary evil.

function RemoteScript(aUrl) {
  this._baseName = null;
  this._dependencies = [];
  this._metadata = null;
  this._progress = [0, 0];
  this._progressCallbacks = [];
  this._progressIndex = 0;
  this._scriptFile = null;
  this._scriptMetaCallbacks = [];
  this._tempDir = GM_util.getTempDir();
  this._uri = GM_util.uriFromUrl(aUrl);
  this._url = aUrl;

  this.done = false;
  this.script = null;
}

/** Clean up all temporary files. */
RemoteScript.prototype.cleanup = function() {
  if (this._wbp) this._wbp.cancelSave();
  if (this._tempDir && this._tempDir.exists()) {
    this._tempDir.remove(true);
  }
};

/** Download the entire script, starting from the .user.js itself. */
RemoteScript.prototype.download = function(aCompletionCallback) {
  aCompletionCallback = aCompletionCallback || function() {};
  assertIsFunction(
      aCompletionCallback, 'Completion callback is not a function.');

  this.downloadScript(GM_util.hitch(this, function(aSuccess, aPoint) {
    if (aSuccess) this._downloadDependencies(aCompletionCallback);
    aCompletionCallback(aSuccess, aPoint);
  }));
};

/** Download just enough of the script to find the metadata. */
RemoteScript.prototype.downloadMetadata = function(aCallback) {
  // TODO Is this good/useful?  For update checking?
};

/** Download just the .user.js itself. Callback upon completion. */
RemoteScript.prototype.downloadScript = function(aCompletionCallback) {
  assertIsFunction(
      aCompletionCallback, 'Completion callback is not a function.');
  if (!this._url) throw Error('Tried to download script, but have no URL.');

  this._scriptFile = GM_util.getTempFile(
      this._tempDir, filenameFromUri(this._uri, 'gm_script'));

  this._downloadFile(this._uri, this._scriptFile,
      GM_util.hitch(this, this._downloadScriptCb, aCompletionCallback));
};

RemoteScript.prototype.install = function(aOldScript) {
  if (!this.script) {
    throw new Error('RemoteScript.install(): Script is not downloaded.');
  }
  if (!this._baseName) {
    throw new Error('RemoteScript.install(): Script base name unknown.');
  }

  var suffix = 0;
  var file = GM_util.scriptDir();
  file.append(this._baseName);
  while (file.exists()) {
    suffix++;
    file = GM_util.scriptDir();
    file = append(this._baseName + '-' + suffix);
  }
  this._baseName = file.leafName;

  this.script.setFilename(this._baseName, this._scriptFile.leafName);
  this._tempDir.moveTo(GM_util.scriptDir(), this._baseName);
  this._tempDir = null;

  GM_config.install(this.script, aOldScript);
};

/** Add a progress callback. */
RemoteScript.prototype.onProgress = function(aCallback) {
  assertIsFunction(aCallback, 'Progress callback is not a function.');
  this._progressCallbacks.push(aCallback);
};

/** Add a "script meta data is available" callback. */
RemoteScript.prototype.onScriptMeta = function(aCallback) {
  assertIsFunction(aCallback, 'Script meta callback is not a function.');
  this._scriptMetaCallbacks.push(aCallback);
};

RemoteScript.prototype.toString = function() {
  return '[RemoteScript object; ' + this._url + ']';
};

//////////////////////////// Private Implementation ////////////////////////////

RemoteScript.prototype._dispatchCallbacks = function(aType, aData) {
  var callbacks = this['_' + aType + 'Callbacks'];
  if (!callbacks) {
    throw Error('Invalid callback type: ' + aType);
  }
  for (var i = 0, callback = null; callback = callbacks[i]; i++) {
    callback(this, aType, aData);
  }
};

/** Download any dependencies (@icon, @require, @resource). */
RemoteScript.prototype._downloadDependencies = function(aCompletionCallback) {
  dump('>>> RemoteScript._downloadDependencies() ...\n');

  this._progressIndex++;
  if (this._progressIndex > this._dependencies.length) {
    this.done = true;
    this._dispatchCallbacks('progress', 1);
    return aCompletionCallback(true, 'dependencies');
  }

  // Because _progressIndex includes the base script at 0, subtract one to
  // get the dependency index.
  var dependency = this._dependencies[this._progressIndex - 1];
  var uri = GM_util.uriFromUrl(dependency.urlToDownload);
  var file = GM_util.getTempFile(this._tempDir, filenameFromUri(uri));
  dependency.setFilename(file);

  function dependencyDownloadComplete(aChannel) {
    if (dependency.setMimetype) {
      dump('setting mime type for ' + dependency + ' to ' + aChannel.contentType + '\n');
      dependency.setMimetype(aChannel.contentType);
    }
    if (dependency.setCharset) {
      dump('setting charset for ' + dependency + ' to ' + aChannel.contentCharset + '\n');
      dependency.setCharset(aChannel.contentCharset || null);
    }
    this._downloadDependencies(aCompletionCallback);
  }

  this._downloadFile(
      uri, file, GM_util.hitch(this, dependencyDownloadComplete));
};

/** Download a given nsIURI to a given nsILocalFile, with optional callback. */
RemoteScript.prototype._downloadFile = function(
    aUri, aFile, aCompletionCallback) {
  dump('>>> RemoteScript._downloadFile('+aUri.spec+') ...\n');
  try {
  aUri = aUri.QueryInterface(Ci.nsIURI);
  aFile = aFile.QueryInterface(Ci.nsILocalFile);
  aCompletionCallback = aCompletionCallback || function() {};
  assertIsFunction(aCompletionCallback,
      '_downloadFile() completion callback is not a function.');

  // Dangerous semi-global state:  The web browser persist object is stored
  // in the object, so that it can be canceled.  Parallel downloads would need
  // to be handled differently.
  var channel = ioService.newChannelFromURI(aUri);
  this._wbp = Cc['@mozilla.org/embedding/browser/nsWebBrowserPersist;1']
      .createInstance(Ci.nsIWebBrowserPersist);
  this._wbp.persistFlags =
      Ci.nsIWebBrowserPersist.PERSIST_FLAGS_BYPASS_CACHE |
      Ci.nsIWebBrowserPersist.PERSIST_FLAGS_REPLACE_EXISTING_FILES |
      Ci.nsIWebBrowserPersist.PERSIST_FLAGS_CLEANUP_ON_FAILURE |
      Ci.nsIWebBrowserPersist.PERSIST_FLAGS_FORCE_ALLOW_COOKIES;
  this._wbp.progressListener = new ProgressListener(
      this,
      GM_util.hitch(null, aCompletionCallback, channel),
      GM_util.hitch(this, this._downloadFileProgress, channel));
  this._wbp.saveChannel(channel, aFile);
  } catch (e) { dump(e+'\n'); }
};

RemoteScript.prototype._htmlTypeRegex = new RegExp('^text/(x|ht)ml', 'i');
RemoteScript.prototype._downloadFileProgress = function(
    aChannel, aFileProgress) {
  dump('>>> RemoteScript._downloadFileProgress('+aChannel+', '+aFileProgress+') ...\n');
  if (0 == this._progressIndex && !this.script) {
    // We are downloading the first file, and haven't parsed a script yet ...

    // 1) Detect an HTML page and abort if so.
    try {
      // TODO: Detect the content type *after* 30x redirect.
      var httpChannel = aChannel.QueryInterface(Ci.nsIHttpChannel);
      var contentType = httpChannel.getResponseHeader('Content-Type');
      if (this._htmlTypeRegex.test(contentType)) {
        this.cleanup();
        return false;
      }
    } catch (e) {
      dump('RemoteScript._downloadFileProgress():\n\t' + e);
    }

    // 2) Otherwise try to parse the script from the downloaded file.
    this.script = this._parseScriptFile();
    if (this.script) {
      // And if successful, prepare to download dependencies.
      this._dependencies = this.script.requires.concat(this.script.resources);
      if (this.script.icon.hasDownloadURL()) {
        this._dependencies.push(this.script.icon);
      }
      this._progress = [];
      for (var i = 0; i < this._dependencies.length; i++) {
        this._progress[i] = 0;
      }
    }
  }

  this._progress[this._progressIndex] = aFileProgress;
  var progress = this._progress.reduce(function(a, b) { return a + b; })
      / this._progress.length;

  this._dispatchCallbacks('progress', progress);

  return true;
};

RemoteScript.prototype._downloadScriptCb = function(
    aCompletionCallback, aChannel, aSuccess) {
  dump('>>> RemoteScript._downloadScriptCb() ...\n');
  if (aSuccess) {
    // At this point downloading the script itself is definitely done.
    if (!this.script) {
      // If we don't have a script object, we failed to find metadata and parse
      // it during download.  Try one last time.
      this.script = this._parseScriptFile(true);
    }
    if (!this.script) {
      dump('RemoteScript: finishing with error because no script was found.\n');
      // If we STILL don't have a script, this is a fatal error.
      return aCompletionCallback(false, 'script');
    }
  } else {
    this.cleanup();
  }
  aCompletionCallback(aSuccess, 'script');
};

/** Produce a Script object from the contents of this._scriptFile. */
RemoteScript.prototype._metadataRegExp = new RegExp(
    '^// ==UserScript==([\\s\\S]*?)^// ==/UserScript==', 'm');
RemoteScript.prototype._parseScriptFile = function(aForce) {
  var content = GM_util.getContents(this._scriptFile);
  var meta = content.match(this._metadataRegExp);

  var source = (meta && meta[0]) || (aForce && content) || null;
  if (source) {
    try {
      var script = GM_config.parse(source, this._uri);
    } catch (e) {
      dump('RemoteScript._parseScriptFile error: ' + e + '\n');
      // TODO: Surface this error?  How?
      // TODO: In case of parse error, stop download?
      return null;
    }
    this._baseName = cleanFilename(script.name, 'gm-script');
    this._dispatchCallbacks('scriptMeta', script);
    return script;
  }

  return null;
};
