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

var stringBundle = Components
    .classes["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .createBundle("chrome://greasemonkey/locale/greasemonkey.properties");
var stringBundleBrowser = Components
    .classes["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .createBundle("chrome://greasemonkey/locale/gm-browser.properties");

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
    aRemoteScript, aUri, aCompletionCallback, aProgressCallback) {
  this._completionCallback = aCompletionCallback || function() {};
  this._progressCallback = aProgressCallback || function() {};
  this._remoteScript = aRemoteScript;
  this._uri = aUri;
}

ProgressListener.prototype.onLocationChange = function(
    aWebProgress, aRequest, aLocation) {
};

ProgressListener.prototype.onProgressChange = function(
    aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress,
    aCurTotalProgress, aMaxTotalProgress) {
  var progress = aCurTotalProgress / aMaxTotalProgress;
  if (-1 == aMaxTotalProgress) progress = 0;

  if (this._progressCallback(aRequest, progress)) {
    // The progress callback is where we check for HTML type, and return true
    // (error status) if so.  In such a case, immediately complete as a failure.
    this._completionCallback(aRequest, false, 'script');
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
  var errorMessage = stringBundle.GetStringFromName('error.unknown');
  try {
    var httpChannel = aRequest.QueryInterface(Ci.nsIHttpChannel);
    error |= !httpChannel.requestSucceeded;
    error |= httpChannel.responseStatus >= 400;
    errorMessage = stringBundle.GetStringFromName('error.serverReturned')
        + ' ' + httpChannel.responseStatus + ' '
        + httpChannel.responseStatusText + '.';
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

  if (error) {
    errorMessage = stringBundle.GetStringFromName('error.downloadingUrl')
        + '\n' + this._uri.spec + '\n\n' + errorMessage;
    this._remoteScript.cleanup(errorMessage);
  }
  error |= this._progressCallback(aRequest, 1);
  this._completionCallback(aRequest, !error);
};

ProgressListener.prototype.onStatusChange = function(
    aWebProgress, aRequest, aStatus, aMessage) {
  // TODO: Better figure out the possible aStatus values.  Docs say:
  // "This interface does not define the set of possible status codes."

  // Manually found when reading an invalid file:/// URL.
  if (2152857618 == aStatus) this._completionCallback(aRequest, false);
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
  this.errorMessage = null;
  this.script = null;
}

RemoteScript.prototype.__defineGetter__(
    'url', function() { return new String(this._url); });

/** Clean up all temporary files, stop all actions. */
RemoteScript.prototype.cleanup = function(aErrorMessage) {
  this.errorMessage = aErrorMessage || null;
  this.done = true;

  if (this._wbp) this._wbp.cancelSave();
  if (this._tempDir && this._tempDir.exists()) {
    this._tempDir.remove(true);
  }

  this._dispatchCallbacks('progress', 1);
};

/** Download the entire script, starting from the .user.js itself. */
RemoteScript.prototype.download = function(aCompletionCallback) {
  aCompletionCallback = aCompletionCallback || function() {};
  assertIsFunction(
      aCompletionCallback, 'Completion callback is not a function.');

  if (this.script) {
    // TODO: Verify that this condition really is sufficient.  Is the script
    // completely loaded?
    this._downloadDependencies(aCompletionCallback);
  } else {
    this.downloadScript(GM_util.hitch(this, function(aSuccess, aPoint) {
      if (aSuccess) this._downloadDependencies(aCompletionCallback);
      aCompletionCallback(aSuccess, aPoint);
    }));
  }
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

RemoteScript.prototype.install = function(aOldScript, aOnlyDependencies) {
  if (!this.script) {
    throw new Error('RemoteScript.install(): Script is not downloaded.');
  }
  if ('undefined' == typeof aOnlyDependencies) aOnlyDependencies = false;

  if (aOnlyDependencies) {
    // Just move the dependencies in.
    var enumerator = this._tempDir.directoryEntries;
    while (enumerator.hasMoreElements()) {
      var file = enumerator.getNext().QueryInterface(Ci.nsILocalFile);
      // TODO: Fix invalid private access.
      file.moveTo(this.script._basedirFile, null);
    }
  } else {
    // Completely install the new script.
    if (!this._baseName) {
      throw new Error('RemoteScript.install(): Script base name unknown.');
    }

    var suffix = 0;
    var file = GM_util.scriptDir();
    file.append(this._baseName);
    while (file.exists()) {
      suffix++;
      file = GM_util.scriptDir();
      file.append(this._baseName + '-' + suffix);
    }
    this._baseName = file.leafName;

    this.script.setFilename(this._baseName, this._scriptFile.leafName);
    this._tempDir.moveTo(GM_util.scriptDir(), this._baseName);
    this._tempDir = null;
  }

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

/** Set the (installed) script, in order to download modified dependencies.
 *
 * After calling this, calling .download() will only get dependencies.  This
 * RemoteScript can then safely be .install(oldScript)'ed.
 */
RemoteScript.prototype.setScript = function(aScript) {
  this._scriptFile = aScript.file;
  this._baseName = aScript._basedir;
  this.script = aScript;
  this._postParseScriptFile();
}

RemoteScript.prototype.showSource = function(aTabBrowser) {
  // Turn standard browser into tab browser, if necessary.
  if (aTabBrowser.getTabBrowser) aTabBrowser = aTabBrowser.getTabBrowser()

  if (this._progress[0] < 1) {
    throw new Error('Script is not loaded!');
  }

  var tab = aTabBrowser.loadOneTab(
      ioService.newFileURI(this._scriptFile).spec,
      {'inBackground': false});
  var notificationBox = aTabBrowser.getNotificationBox();
  notificationBox.appendNotification(
    stringBundleBrowser.GetStringFromName('greeting.msg'),
    "install-userscript",
    "chrome://greasemonkey/skin/icon16.png",
    notificationBox.PRIORITY_WARNING_MEDIUM,
    [{
      'label': stringBundleBrowser.GetStringFromName('greeting.btn'),
      'accessKey': stringBundleBrowser.GetStringFromName('greeting.btnAccess'),
      'popup': null,
      'callback': GM_util.hitch(this, function() {
        GM_util.showInstallDialog(this, aTabBrowser, GM_util.getService());
        // Timeout puts this after the notification closes itself for the
        // button click, avoiding an error inside that (Firefox) code.
        GM_util.timeout(0, function() { aTabBrowser.removeTab(tab); });
      })
    }]
  );
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
  if (this.done) return;

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

  function dependencyDownloadComplete(aChannel, aSuccess) {
    if (!aSuccess) {
      aCompletionCallback(aSuccess, 'dependency');
      return;
    }
    if (dependency.setMimetype) {
      dependency.setMimetype(aChannel.contentType);
    }
    if (dependency.setCharset) {
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
  aUri = aUri.QueryInterface(Ci.nsIURI);
  aFile = aFile.QueryInterface(Ci.nsILocalFile);
  aCompletionCallback = aCompletionCallback || function() {};
  assertIsFunction(aCompletionCallback,
      '_downloadFile() completion callback is not a function.');

  if (!GM_util.isGreasemonkeyable(aUri.spec)) {
    this.cleanup('Will not download unsafe URL:\n' + aUri.spec);
    return;
  }

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
      this, aUri,
      aCompletionCallback, GM_util.hitch(this, this._downloadFileProgress));
  this._wbp.saveChannel(channel, aFile);
};

RemoteScript.prototype._htmlTypeRegex = new RegExp('^text/(x|ht)ml', 'i');
RemoteScript.prototype._downloadFileProgress = function(
    aChannel, aFileProgress) {
  if (0 == this._progressIndex && !this.script) {
    // We are downloading the first file, and haven't parsed a script yet ...

    // 1) Detect an HTML page and abort if so.
    try {
      var httpChannel = aChannel.QueryInterface(Ci.nsIHttpChannel);
      var contentType = httpChannel.getResponseHeader('Content-Type');
      if (this._htmlTypeRegex.test(contentType)) {
        this.cleanup();
        return true;
      }
    } catch (e) {
      dump('RemoteScript._downloadFileProgress() error:\n\t' + e);
    }

    // 2) Otherwise try to parse the script from the downloaded file.
    this.script = this._parseScriptFile();
    if (this.script) {
      // And if successful, prepare to download dependencies.
      this._postParseScriptFile();
    }
  }

  this._progress[this._progressIndex] = aFileProgress;
  var progress = this._progress.reduce(function(a, b) { return a + b; })
      / this._progress.length;

  this._dispatchCallbacks('progress', progress);

  return false;
};

RemoteScript.prototype._downloadScriptCb = function(
    aCompletionCallback, aChannel, aSuccess) {
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
      this.cleanup(
          stringBundle.GetStringFromName('error.parsingScript') + ':\n' + e);
      return null;
    }
    this._baseName = cleanFilename(script.name, 'gm-script');
    this._dispatchCallbacks('scriptMeta', script);
    return script;
  }

  return null;
};

RemoteScript.prototype._postParseScriptFile = function() {
  this._dependencies = this.script.requires.concat(this.script.resources);
  if (this.script.icon.hasDownloadURL()) {
    this._dependencies.push(this.script.icon);
  }
  this._progress = [];
  for (var i = 0; i < this._dependencies.length; i++) {
    this._progress[i] = 0;
  }
};
