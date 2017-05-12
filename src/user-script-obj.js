/*
The UserScript object represents a user script, and all content and behaviors.

Content scripts can and should use `RemoteUserScript`, for display during
the install process.  Nothing else besides `UserScriptRegistry` should ever
reference any other objects from this file.
*/

// Private implementation.
(function() {

let extensionVersion = (function() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', chrome.extension.getURL('manifest.json'), false);
  xhr.send(null);
  var manifest = JSON.parse(xhr.responseText);
  return manifest.version;
})();


/// Safely copies selected input values to another object.
function _loadValuesInto(dest, vals, keys) {
  keys.forEach(k => {
    if (vals.hasOwnProperty(k)) {
      // TODO: This without nasty digging into other object's privates?
      dest['_' + k] = _safeCopy(vals[k]);
    }
  });
}


function _randomUuid() {
  var randomInts = new Uint8Array(16);
  window.crypto.getRandomValues(randomInts);
  var randomChars = [];
  for (let i = 0; i<16; i++) {
    let s = randomInts[i].toString(16);
    randomChars.push(s.substr(0, 1));
    randomChars.push(s.substr(1, 1));
  }

  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
  uuid = uuid.replace(/[xy]/g, function(c) {
    let r = randomChars.shift();
    if (c == 'y') {
      r = (parseInt(r, 16)&0x3|0x8).toString(16);
    }
    return r;
  });

  return uuid;
}


/// Returns v unless v is an array or object, then a (shallow) copy of v.
function _safeCopy(v) {
  if (!v) return v;
  if (v.constructor == Array) return v.slice();
  if (v.constructor == Object) return Object.assign({}, v);
  return v;
}


const userScriptKeys = [
    'description', 'downloadUrl', 'excludes', 'grants', 'includes', 'matches',
    'name', 'namespace', 'noFrames', 'runAt', 'version'];
/// Base class, fields and methods common to all kinds of UserScript objects.
window.RemoteUserScript = class RemoteUserScript {
  constructor(vals) {
    // Fixed details parsed from the ==UserScript== section.
    this._description = null;
    this._downloadUrl = null;
    this._excludes = [];
    this._includes = [];
    this._matches = [];
    this._name = 'user-script';
    this._namespace = null;
    this._noFrames = false;
    this._runAt = 'end';
    this._version = null;

    _loadValuesInto(this, vals, userScriptKeys);
  }

  get details() {
    var d = {};
    userScriptKeys.forEach(k => {
      d[k] = _safeCopy(this['_' + k]);
    });
    d.id = this.id;
    return d;
  }

  get description() { return this._description; }
  get downloadUrl() { return this._downloadUrl; }
  get excludes() { return _safeCopy(this._excludes); }
  get grants() { return _safeCopy(this._grants); }
  get includes() { return _safeCopy(this._includes); }
  get matches() { return _safeCopy(this._matches); }
  get name() { return this._name; }
  get namespace() { return this._namespace; }
  get noFrames() { return this._noFrames; }
  get runAt() { return this._runAt; }
  get version() { return this._version; }

  get id() { return this.namespace + '/' + this.name; }

  runsAt(url) {
    if (!(url instanceof URL)) {
      throw new Error('runsAt() got non-url parameter: ' + url);
    }
    // TODO: Implement!!
    return true;
  }
}


const runnableUserScriptKeys = [
    'enabled', 'evalContent', 'iconBlob', 'resourceBlobs',
    'userExcludes', 'userMatches', 'userIncludes', 'uuid'];
/// A _UserScript, plus user settings, plus (eval'able) contents.  Should
/// never be called except by `UserScriptRegistry.`
window.RunnableUserScript = class RunnableUserScript
    extends window.RemoteUserScript {
  constructor(details) {
    super(details);

    this._enabled = true;
    this._evalContent = null;  // TODO: Calculated final eval string.  Blob?
    this._iconBlob = null;
    this._resourceBlobs = {};  // Name to blob.
    this._userExcludes = [];  // TODO: Not implemented.
    this._userIncludes = [];  // TODO: Not implemented.
    this._userMatches = [];  // TODO: Not implemented.
    this._uuid = null;

    _loadValuesInto(this, details, runnableUserScriptKeys);

    if (!this._uuid) {
      this._uuid = _randomUuid();
      console.info(
          'For new RunnableUserScript ' + this._name
          + ', created UUID: ' + this._uuid);
    }
  }

  get details() {
    var d = super.details;
    runnableUserScriptKeys.forEach(k => {
      d[k] = _safeCopy(this['_' + k]);
    });
    return d;
  }

  get enabled() { return this._enabled; }
  set enabled(v) { this._enabled = !!v; }

  // TODO: Setters/mutators.
  get userExcludes() { return _safeCopy(this._userExcludes); }
  get userIncludes() { return _safeCopy(this._userIncludes); }
  get userMatches() { return _safeCopy(this._userMatches); }

  get evalContent() { return this._evalContent; }
  get iconBlob() { return this._iconBlob; }
  get resourceBlobs() { return _safeCopy(this._resourceBlobs); }
  get uuid() { return this._uuid; }
}


const editableUserScriptKeys = [
    'parsedDetails', 'content', 'requiresContent'];
/// A _UserScript, plus user settings, plus all requires' contents.  Should
/// never be called except by `UserScriptRegistry.`
window.EditableUserScript = class EditableUserScript
    extends window.RunnableUserScript {
  constructor(details) {
    super(details);

    this._parsedDetails = null;  // All details from parseUserScript().
    this._content = null;
    this._requiresContent = {};  // Map of download URL to content.

    _loadValuesInto(this, details, editableUserScriptKeys);
  }

  get details() {
    var d = super.details;
    editableUserScriptKeys.forEach(k => {
      d[k] = _safeCopy(this['_' + k]);
    });
    return d;
  }

  get parsedDetails() { return this._parsedDetails; }
  get content() { return this._content; }
  get requiresContent() { return _safeCopy(this._requiresContent); }

  calculateEvalContent() {
    this._evalContent
        = '(function(){\n'
        + this.calculateGmInfo() + '\n\n'
        + this._content + '\n\n'
        + Object.values(this._requiresContent).join('\n\n')
        + '})();\n\n//# sourceURL=user-script:' + escape(this.id);
  }

  calculateGmInfo() {
    let gmInfo = {
      'script': {
        'description': this.description,
        'name': this.name,
        'namespace': this.namespace,
        'resources': {},
        'version': this.version,
      },
      'scriptHandler': 'Webbymonkey',
      'uuid': this.uuid,
      'version': extensionVersion,
    };
    Object.keys(this.resourceBlobs).forEach(n => {
      // This value is useless to content; see http://bugzil.la/1356568 .
      gmInfo.script.resources[n] = URL.createObjectURL(this.resourceBlobs[n]);
    });
    return 'const GM_info=' + JSON.stringify(gmInfo) + ';';
  }

  updateFromEditorSaved(message) {
    // Save immediately passed details.
    this._content = message.content;
    this._requiresContent = message.requires;

    let newDetails = parseUserScript(
        message.content, this.downloadUrl, false);

    // Remove any no longer referenced remotes.
    if (!newDetails.iconUrl) {
      this._iconBlob = null;
    }

    Object.keys(this._requiresContent).forEach(u => {
      if (newDetails.requireUrls.indexOf(u) === -1) {
        delete this._requiresContent[u];
      }
    });

    Object.keys(this._resourceBlobs).forEach(n => {
      if (!newDetails.resourceUrls.hasOwnProperty(n)) {
        delete this._resourceBlobs[n];
      }
    });

    // Add newly referenced remotes (and download them).
    return new Promise((resolve, reject) => {
      let updater = new RemoteUpdater(
          this._parsedDetails, newDetails,
          () => {
            // TODO: Check for & pass download failures via reject.
            if (updater.iconDownload) {
              this._iconBlob = updater.iconDownload.xhr.response;
            }
            updater.requireDownloads.forEach(d => {
              this._requiresContent[d.url] = d.xhr.responseText;
            });
            Object.keys(updater.resourceDownloads).forEach(n => {
              let d = updater.resourceDownloads[n];
              this._resourceBlobs[n] = d.xhr.response;
            });

            this._parsedDetails = newDetails;
            this.calculateEvalContent();
            resolve();
          });
      if (updater.skip()) {
        console.log('updater has no added remotes to handle');
        this._parsedDetails = newDetails;
        this.calculateEvalContent();
        resolve();
      }
    });
  }

  // Given a successful/completed `Downloader` object, update this script
  // from it.
  updateFromDownloader(downloader) {
    this._content = downloader.scriptDownload.xhr.responseText;
    if (downloader.iconDownload) {
      this._iconBlob = downloader.iconDownload.xhr.response;
    }
    this._requiresContent = {};
    downloader.requireDownloads.forEach(d => {
      this._requiresContent[d.url] = d.xhr.responseText;
    });
    this._resourceBlobs = {};
    Object.keys(downloader.resourceDownloads).forEach(u => {
      // TODO: Store by resource name, not URL.
      this._resourceBlobs[u] = downloader.resourceDownloads[u].xhr.response;
    });
    this.calculateEvalContent();

    this._parsedDetails = downloader.scriptDetails;
    _loadValuesInto(this, downloader.scriptDetails, userScriptKeys);
  }
}


class RemoteUpdater {
  constructor(oldDetails, newDetails, onLoad) {
    this._onLoad = onLoad;

    this.iconDownload = null;
    if (oldDetails.iconUrl != newDetails.iconUrl) {
      this.iconDownload = new Download(this, newDetails.iconUrl, true);
    }

    this.requireDownloads = [];
    newDetails.requireUrls.forEach(u => {
      if (oldDetails.requireUrls.indexOf(u) === -1) {
        this.requireDownloads.push(new Download(this, u, false));
      }
    });

    this.resourceDownloads = {};
    Object.keys(newDetails.resourceUrls).forEach(n => {
      if (!oldDetails.resourceUrls.hasOwnProperty(n)
          || oldDetails.resourceUrls[n] != newDetails.resourceUrls[n]
      ) {
        let u = newDetails.resourceUrls[n];
        this.resourceDownloads[n] = new Download(this, u, true);
      }
    });
  }

  onLoad(download, event) {
    if (this.pending()) return;
    this._onLoad();
  }

  onProgress(download, event) {
    // Ignore.
  }

  pending() {
    return (this.iconDownload && this.iconDownload.pending)
        || this.requireDownloads.filter(d => d.pending).length > 0
        || Object.values(this.resourceDownloads)
            .filter(d => d.pending).length > 0;
  }

  skip() {
    return !this.iconDownload
        && this.requireDownloads.length == 0
        && Object.values(this.resourceDownloads).length == 0;
  }
}

})();
