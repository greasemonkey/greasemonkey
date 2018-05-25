'use strict';

class DownloadError extends Error {
  constructor(failedDownloads) {
    super('Download(s) failed; see `.failedDownloads`.');
    this.name = this.constructor.name;
    this.failedDownloads = failedDownloads;
  }
}


// Private implementation.
(function() {

class Downloader {
  constructor() {
    this.errors = [];

    this.scriptDownload = null;
    this.iconDownload = null;
    this.requireDownloads = {};
    this.resourceDownloads = {};

    this.scriptDetails = new Promise((resolve, reject) => {
      this._scriptDetailsResolve = resolve;
      this._scriptDetailsReject = reject;
    });

    this._knownIconUrl = null;
    this._knownIconBlob = null;
    this._knownRequires = {};
    this._knownResources = {};
    this._knownUuid = null;

    this._progressListeners = [];

    this._scriptContent = null;
    this._scriptDetailsResolved = false;
    this._scriptUrl = null;
  }

  get progress() {
    if (!this.scriptDownload) return 0;
    let p = this.scriptDownload.progress +
        (this.iconDownload ? this.iconDownload.progress : 0)
        + Object.values(this.requireDownloads)
            .map(d => d.progress).reduce((a, b) => a + b, 0)
        + Object.values(this.resourceDownloads)
            .map(d => d.progress).reduce((a, b) => a + b, 0);
    let t = 1 + (this.iconDownload ? 1 : 0)
        + Object.keys(this.requireDownloads).length
        + Object.keys(this.resourceDownloads).length;
    return p / t;
  }

  setKnownIcon(url, blob) {
    this._knownIconUrl = url;
    this._knownIconBlob = blob;
  }
  setKnownRequires(requires) { this._knownRequires = requires; }
  setKnownResources(resources) { this._knownResources = resources; }
  setKnownUuid(uuid) { this._knownUuid = uuid; }

  setScriptUrl(val) { this._scriptUrl = val; return this; }
  setScriptContent(val) { this._scriptContent = val; return this; }
  setScriptValues(keyPairs) { this._scriptValues = keyPairs; return this; }

  addProgressListener(cb) {
    this._progressListeners.push(cb);
  }

  // TODO: Rename this to "results"?
  async details() {
    let details = {
      'content': await this.scriptDownload.result,
      'icon': this.iconDownload && await this.iconDownload.result,
      'requires': {},
      'resources': {},
    };

    // Synchronous loops so `await` blocks our async. return.
    // TODO: Is this necessary?
    for (let [u, d] of Object.entries(this.requireDownloads)) {
      details.requires[u] = await d.result;
    }

    for (let [n, d] of Object.entries(this.resourceDownloads)) {
      details.resources[n] = {
        'name': n,
        'mimetype': d.mimeType,
        'blob': await d.result,
      };
    }

    details.valueStore = this._scriptValues || null;
    return details;
  }

  async install(disabled=false, openEditor=false) {
    let scriptDetails = await this.scriptDetails;
    let downloaderDetails = await this.details();
    scriptDetails.enabled = !disabled;

    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        'name': 'UserScriptInstall',
        'userScript': scriptDetails,
        'downloader': downloaderDetails,
      }, (uuid) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          resolve(uuid);
          if (openEditor) {
            openUserScriptEditor(uuid);
          }
        }
      });
    });
  }

  async start() {
    if (this._scriptContent != null) {
      this.scriptDownload = new ImmediateDownload(this._scriptContent);
      let scriptDetails = parseUserScript(
          this._scriptContent instanceof Promise
              ? await this._scriptContent : this._scriptContent,
          this._scriptUrl);
      if (scriptDetails) {
        if (this._knownUuid) {
          scriptDetails.uuid = this._knownUuid;
        }
        this._scriptDetailsResolve(scriptDetails);
      }
      this._scriptDetailsResolved = true;
    } else {
      this.scriptDownload = new Download(
          this._onProgress.bind(this), this._scriptUrl);
    }

    let scriptDetails = await this.scriptDetails;

    if (scriptDetails.iconUrl) {
      if (this._knownIconUrl == scriptDetails.iconUrl) {
        this.iconDownload = new ImmediateDownload(this._knownIconBlob);
      } else {
        this.iconDownload = new Download(
            this._onProgress.bind(this), scriptDetails.iconUrl,
            /*binary=*/true);
      }
    }

    scriptDetails.requireUrls.forEach(u => {
      if (this._knownRequires[u]) {
        this.requireDownloads[u]
            = new ImmediateDownload(this._knownRequires[u]);
      } else {
        this.requireDownloads[u]
            = new Download(this._onProgress.bind(this), u);
      }
    });

    Object.keys(scriptDetails.resourceUrls).forEach(n => {
      let u = scriptDetails.resourceUrls[n];
      if (this._knownResources[u]) {
        this.resourceDownloads[n]
            = new ImmediateDownload(this._knownResources[u]);
      } else {
        this.resourceDownloads[n]
            = new Download(this._onProgress.bind(this), u, /*binary=*/true);
      }
    });

    let allDownloads = Object.values(this.requireDownloads)
        .concat(Object.values(this.resourceDownloads));
    if (this.iconDownload) {
      allDownloads.unshift(this.iconDownload);
    }
    allDownloads.unshift(this.scriptDownload);

    let failedDownloads = [];
    for (let download of allDownloads) {
      try {
        await download.result;
      } catch (e) {
        failedDownloads.push(download);
      }
    }
    if (failedDownloads.length > 0) {
      throw new DownloadError(failedDownloads);
    }
  }

  _onProgress(download, event) {
    if (!this._scriptDetailsResolved
        && download == this.scriptDownload
    ) {
      let responseSoFar = event.target.response;
      try {
        let scriptDetail = parseUserScript(
            responseSoFar, this._scriptUrl,
            /*failWhenMissing=*/download.pending);
        if (scriptDetail) {
          this._scriptDetailsResolve(scriptDetail);
          this._scriptDetailsResolved = true;
        }
      } catch (e) {
        // If the download is still pending, errors might be resolved as we
        // finish.  If not, errors are fatal.
        if (!download.pending) {
          this._scriptDetailsReject(e);
          return;
        } else {
          console.warn('downloader parse fail:', e);
        }
      }
    }

    this._progressListeners.forEach(
        listener => listener.call([this]));
  }
}
window.UserScriptDownloader = Downloader;


class Download {
  constructor(progressCb, url, binary=false) {
    this.error = null;
    this.mimeType = null;
    this.pending = true;
    this.progress = 0;
    this.status = null;
    this.statusText = null;
    this.url = url;

    this._progressCb = progressCb;

    this.result = new Promise((resolve, reject) => {
      let xhr = new XMLHttpRequest();

      xhr.addEventListener('abort', this._onError.bind(this, reject));
      xhr.addEventListener('error', this._onError.bind(this, reject));
      xhr.addEventListener(
          'load', this._onLoad.bind(this, xhr, resolve, reject));
      xhr.addEventListener('progress', this._onProgress.bind(this));

      xhr.open('GET', url);
      if (binary) xhr.responseType = 'blob';

      xhr.send();
    });
  }

  _onError(reject) {
    this.progress = 1;
    reject();
  }

  _onLoad(xhr, resolve, reject, event) {
    if (xhr.status < 200 || xhr.status >= 300) {
      this.error = `${xhr.status} - ${xhr.statusText}`;
      reject(this.error);
      return;
    }

    this.mimeType = xhr.getResponseHeader('Content-Type');
    this.pending = false;
    this.progress = 1;
    this._progressCb(this, event);
    this.status = xhr.status;
    this.statusText = xhr.statusText;
    resolve(xhr.response);
  }

  _onProgress(event) {
    this.progress = event.lengthComputable
        ? event.loaded / event.total
        : 0;
    this._progressCb(this, event);
  }
}


class ImmediateDownload {
  constructor(source) {
    this.progress = 1;
    if (source instanceof Promise) {
      this.result = source;
    } else {
      this.result = Promise.resolve(source);
    }
    this.status = 200;
    this.statusText = 'OK';
  }
}

})();
