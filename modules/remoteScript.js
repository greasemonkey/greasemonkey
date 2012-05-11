var EXPORTED_SYMBOLS = ['cleanFilename', 'RemoteScript'];

var Cc = Components.classes;
var Ci = Components.interfaces;

Components.utils.import("resource://greasemonkey/GM_notification.js");
Components.utils.import('resource://greasemonkey/script.js');
Components.utils.import('resource://greasemonkey/util.js');

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

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
var xulRuntime = Components
    .classes["@mozilla.org/xre/app-info;1"]
    .getService(Components.interfaces.nsIXULRuntime);

// See: http://goo.gl/vDSk9
// Actual limit is 260; 240 ensures e.g. ".user.js" and slashes still fit.
// The "/ 2" thing is so that we can have a directory, and a file in it.
var windowsMaxNameLen = (240 - GM_util.scriptDir().path.length) / 2;

/////////////////////////////// Private Helpers ////////////////////////////////

function assertIsFunction(aFunc, aMessage) {
  if (typeof aFunc !== typeof function() {}) throw Error(aMessage);
}

var disallowedFilenameCharacters = new RegExp('[\\\\/:*?\'"<>|]', 'g');
function cleanFilename(aFilename, aDefault) {
  // Blacklist problem characters (slashes, colons, etc.).
  var filename = (aFilename || aDefault).replace(
      disallowedFilenameCharacters, '');

  // Make whitespace readable.
  filename = filename.replace(/(\s|%20)+/g, '_');

  // Limit length on Windows (#1548; http://goo.gl/vDSk9)
  if ('WINNT' == xulRuntime.OS) {
    if (windowsMaxNameLen <= 0) {
      throw Error('Could not make a valid file name to save.');
    }

    var match = filename.match(/^(.+?)(\.(:?user\.js)|[^.{,8}])$/);
    if (match) {
      filename = match[1].substr(0, windowsMaxNameLen) + match[2];
    } else {
      filename = filename.substr(0, windowsMaxNameLen);
    }
  }

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

////////////////////////// Private Download Listener ///////////////////////////

function DownloadListener(
    aTryToParse, aProgressCb, aCompletionCallback, aFile, aRemoteScript) {
  this._completionCallback = aCompletionCallback;
  this._data = [];
  this._progressCallback = aProgressCb;
  this._remoteScript = aRemoteScript;
  this._tryToParse = aTryToParse;

  this._fileOutputStream = Cc["@mozilla.org/network/file-output-stream;1"]
      .createInstance(Ci.nsIFileOutputStream);
  this._fileOutputStream.init(aFile, -1, -1, null);
  this._binOutputStream = Cc['@mozilla.org/binaryoutputstream;1']
      .createInstance(Ci.nsIBinaryOutputStream);
  this._binOutputStream.setOutputStream(this._fileOutputStream);
}

DownloadListener.prototype = {
  _htmlTypeRegex: new RegExp('^text/(x|ht)ml', 'i'),

  _parse: function(aRemoteScript) {
    var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
        .createInstance(Ci.nsIScriptableUnicodeConverter);
    converter.charset = 'UTF-8';
    var source = converter.convertFromByteArray(this._data, this._data.length)
    return this._remoteScript.parseScript(source, false);
  },

  // nsIStreamListener
  onDataAvailable: function(aRequest, aContext, aInputStream, aOffset, aCount) {
    var binaryInputStream = Cc['@mozilla.org/binaryinputstream;1']
        .createInstance(Ci.nsIBinaryInputStream);
    binaryInputStream.setInputStream(aInputStream);

    // Read incoming data.
    var data = binaryInputStream.readByteArray(aCount);

    if (this._tryToParse) {
      this._data = this._data.concat(data);
      if (this._parse(aContext)) this._tryToParse = false;
    } else {
      this._data = null;
    }

    // Write it to the file.
    this._binOutputStream.writeByteArray(data, data.length);
  },

  // nsIProgressEventSink
  onProgress: function(aRequest, aContext, aProgress, aProgressMax) {
    var progress;
    if (-1 == aProgressMax || 0 == aProgressMax
        || 0xFFFFFFFFFFFFFFFF == aProgressMax) {
      progress = 0
    } else {
      progress = aProgress / aProgressMax;
    }
    this._progressCallback(aRequest, progress);
  },

  // nsIRequestObserver
  onStartRequest: function(aRequest, aContext) {
    // For the first file (the script) detect an HTML page and abort if so.
    if (this._tryToParse) {
      try {
        aRequest.QueryInterface(Ci.nsIHttpChannel);
      } catch (e) {
        return;  // Non-http channel?  Ignore.
      }
      if (this._htmlTypeRegex.test(aRequest.contentType)) {
        this._completionCallback(aRequest, false, 'script');
      }
    }
  },

  // nsIRequestObserver
  onStopRequest: function(aRequest, aContext, aStatusCode) {
    this._binOutputStream.close();
    this._fileOutputStream.close();

    var error = aStatusCode !== 0;
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

    this._completionCallback(aRequest, !error);
  },

  // nsIProgressEventSink
  onStatus: function(aRequest, aContext, aStatus, aStatusArg) { },

  // nsIInterfaceRequestor
  getInterface: function(aIID) { return this.QueryInterface(aIID) },

  // nsISupports
  QueryInterface: XPCOMUtils.generateQI([
      Ci.nsIClassInfo,
      Ci.nsIProgressEventSink,
      Ci.nsIStreamListener,
      Ci.nsISupports,
      ]),
}

/////////////////////////////// Public Interface ///////////////////////////////

// Note: The design of this class is very asynchronous, with the result that
// the code path spaghetti's through quite a few callbacks.  A necessary evil.

function RemoteScript(aUrl) {
  this._baseName = null;
  this._channels = [];
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
  this.messageName = 'script.installed';
  this.script = null;
}

RemoteScript.prototype.__defineGetter__(
    'url', function() { return new String(this._url); });

/** Clean up all temporary files, stop all actions. */
RemoteScript.prototype.cleanup = function(aErrorMessage) {
  this.errorMessage = aErrorMessage || null;
  this.done = true;

  this._channels.forEach(function(aChannel) {
    try {
      aChannel.QueryInterface(Ci.nsIRequest);
    } catch (e) {
      return;
    }
    aChannel.cancel(Components.results.NS_BINDING_ABORTED);
  });
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

    GM_config.install(this.script, aOldScript);

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

    // Let the config know the base/file name has changed to its real value now.
    GM_config._changed(this.script, 'modified', this.script.id);

    // Let the user know we're all done.
    GM_notification(
        "'" + this.script.name + "' "
        + stringBundleBrowser.GetStringFromName(this.messageName));
  }
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

/** Parse the source code of the script, discover dependencies, data & etc. */
RemoteScript.prototype.parseScript = function(aSource, aFatal) {
  if (this.errorMessage) return false;
  if (this.script) return true;

  var scope = {};
  Components.utils.import('resource://greasemonkey/parseScript.js', scope);
  var script = scope.parse(aSource, this._uri, true);
  if (!script || script.parseErrors.length) {
    if (aFatal) {
      this.cleanup(
          stringBundle.GetStringFromName('error.parsingScript')
          + '\n' + script.parseErrors);
    }
    return false;
  }

  this._baseName = cleanFilename(script.name, 'gm-script');
  this._dispatchCallbacks('scriptMeta', script);
  this.script = script;
  this._postParseScript();

  return true;
};

/** Set the (installed) script, in order to download modified dependencies.
 *
 * After calling this, calling .download() will only get dependencies.  This
 * RemoteScript can then safely be .install(oldScript)'ed.
 */
RemoteScript.prototype.setScript = function(aScript, aTempFile) {
  this._scriptFile = aScript.file;
  this._baseName = aScript._basedir;
  this.script = aScript;
  if (aTempFile) {
    // Special case for "new script" dialog.
    this._scriptFile = aTempFile;
    this._baseName = cleanFilename(aScript.name, 'gm-script');
  }
  this._postParseScript();
};

RemoteScript.prototype.showSource = function(aTabBrowser) {
  // Turn standard browser into tab browser, if necessary.
  if (aTabBrowser.getTabBrowser) aTabBrowser = aTabBrowser.getTabBrowser();

  if (this._progress[0] < 1) {
    throw new Error('Script is not loaded!');
  }

  var tab = aTabBrowser.loadOneTab(
      ioService.newFileURI(this._scriptFile).spec,
      {'inBackground': false});
  function addNotification() {
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
          GM_util.timeout(function() { aTabBrowser.removeTab(tab); }, 0);
        })
      }]
    );
  }
  // Timeout necessary only for Firefox 3 as a dirty hack around timing issues.
  GM_util.timeout(GM_util.hitch(this, addNotification), 0);
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
  var uri = GM_util.uriFromUrl(dependency.downloadURL);
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

  // If we have a URI (locally installed scripts, when updating, won't!) ...
  if (this._uri) {
    if (aUri == this._uri) {
      // No-op, always download the script itself.
    } else if (aUri.scheme == this._uri.scheme) {
      // No-op, always allow files from the same scheme as the script.
    } else if (!GM_util.isGreasemonkeyable(aUri.spec)) {
      // Otherwise, these are unsafe.  Do not download them.
      this.cleanup('Will not download unsafe URL:\n' + aUri.spec);
      return;
    }
  }

  var channel = ioService.newChannelFromURI(aUri);
  this._channels.push(channel);
  var dsl = new DownloadListener(
      0 == this._progressIndex,
      GM_util.hitch(this, this._downloadFileProgress),
      aCompletionCallback,
      aFile,
      this
      );
  channel.notificationCallbacks = dsl;
  channel.asyncOpen(dsl, this);
};

RemoteScript.prototype._downloadFileProgress = function(
    aChannel, aFileProgress) {
  this._progress[this._progressIndex] = aFileProgress;
  var progress = this._progress.reduce(function(a, b) { return a + b; })
      / this._progress.length;
  this._dispatchCallbacks('progress', progress);
};

RemoteScript.prototype._downloadScriptCb = function(
    aCompletionCallback, aChannel, aSuccess) {
  if (aSuccess) {
    // At this point downloading the script itself is definitely done.
    this._parseScriptFile();
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

RemoteScript.prototype._parseScriptFile = function() {
  if (this.done) return;
  var source = GM_util.getContents(this._scriptFile);
  if (!source) return null;
  return this.parseScript(source, true);
};

RemoteScript.prototype._postParseScript = function() {
  this._dependencies = this.script.dependencies;
  this._progress = [];
  for (var i = 0; i < this._dependencies.length; i++) {
    this._progress[i] = 0;
  }
};
