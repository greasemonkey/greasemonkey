/*
The UserScript object represents a user script, and all content and behaviors.

Content scripts can and should use `RemoteUserScript`, for display during
the install process.  Nothing else besides `UserScriptRegistry` should ever
reference any other objects from this file.
*/

// Private implementation.
(function() {

const extensionVersion = chrome.runtime.getManifest().version;
const aboutBlankRegexp = /^about:blank/;


function _testClude(glob, url) {
  // Do not run in about:blank unless _specifically_ requested. See #1298
  if (aboutBlankRegexp.test(url.href) && !aboutBlankRegexp.test(glob)) {
    return false;
  }

  return GM_convert2RegExp(glob, url).test(url.href);
}


function _testMatch(matchPattern, url) {
  if ('string' == typeof matchPattern) {
    matchPattern = new MatchPattern(matchPattern);
  }
  return matchPattern.doMatch(url);
}


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
    this._grants = ['none'];
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

    // TODO: Profile cost of pattern generation, cache if justified.
    // TODO: User global excludes.
    // TODO: User includes/excludes/matches.

    for (let glob of this._excludes) {
      if (_testClude(glob, url)) return false;
    }
    for (let glob of this._includes) {
      if (_testClude(glob, url)) return true;
    }
    for (let pattern of this._matches) {
      if (_testMatch(pattern, url)) return true;
    }

    return false;
  }

  toString() {
    return '[Greasemonkey Script ' + this.id + '; ' + this.version + ']';
  }
}


const runnableUserScriptKeys = [
    'enabled', 'evalContent', 'iconBlob', 'resources',
    'userExcludes', 'userIncludes', 'userMatches', 'uuid'];
/// A _UserScript, plus user settings, plus (eval'able) contents.  Should
/// never be called except by `UserScriptRegistry.`
window.RunnableUserScript = class RunnableUserScript
    extends window.RemoteUserScript {
  constructor(details) {
    super(details);

    this._enabled = true;
    this._evalContent = null;  // TODO: Calculated final eval string.  Blob?
    this._iconBlob = null;
    this._resources = {};  // Name to object with keys: name, mimetype, blob.
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
  get resources() { return _safeCopy(this._resources); }
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
    // Put the first line of the script content on line one of the
    // generated content -- wrapped in a function.  Then add the rest
    // of the generated parts.
    this._evalContent
        = 'try {'
        + '(function scopeWrapper(){'
        + 'function userScript(){' + this._content + '} // User Script End.\n\n'
        + this.calculateGmInfo() + '\n\n'
        + apiProviderSource(this) + '\n\n'
        + Object.values(this._requiresContent).join('\n\n')
        + 'userScript();})();\n\n' // Ends scope wrapper.
        + '} catch (e) { console.error("Script error: ", e); }\n\n'
        + '//# sourceURL=user-script:' + escape(this.id);
//    console.log('generated script:\n', this._evalContent);
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
      'scriptHandler': 'Greasemonkey',
      'uuid': this.uuid,
      'version': extensionVersion,
    };
    Object.keys(this.resources).forEach(n => {
      let r = this.resources[n];
      gmInfo.script.resources[n] = {'name': r.name, 'mimetype': r.mimetype};
    });
    return 'const GM = {};\n'
        + 'GM.info=' + JSON.stringify(gmInfo) + ';'
        + 'const GM_info = GM.info;';
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

    Object.keys(this._resources).forEach(n => {
      if (!newDetails.resourceUrls.hasOwnProperty(n)) {
        delete this._resources[n];
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
              this._resources[n] = {
                  'name': n,
                  'mimetype': d.xhr.getResponseHeader('Content-Type'),
                  'blob': d.xhr.response,
              };
            });

            this._parsedDetails = newDetails;
            _loadValuesInto(this, newDetails, userScriptKeys);
            this.calculateEvalContent();
            resolve();
          });
      if (updater.skip()) {
        console.log('updater has no added remotes to handle');
        this._parsedDetails = newDetails;
        _loadValuesInto(this, newDetails, userScriptKeys);
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
    this._resources = {};
    Object.keys(downloader.resourceDownloads).forEach(n => {
      let d = downloader.resourceDownloads[n];
      this._resources[n] = {
          'name': n,
          'mimetype': d.xhr.getResponseHeader('Content-Type'),
          'blob': d.xhr.response,
      };
    });

    this._parsedDetails = downloader.scriptDetails;
    _loadValuesInto(this, downloader.scriptDetails, userScriptKeys);

    this.calculateEvalContent();
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
