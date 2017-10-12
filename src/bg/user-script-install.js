// Private implementation.
(function() {

/// Receive a UserScriptInstall message.
window.onUserScriptInstall = function(message, sender, sendResponse) {
  let downloader = new Downloader(message.details, sender);
  downloader.start(function() {
    if (!downloader.errors.length) {
      UserScriptRegistry.install(downloader);
    }
  });
}


class Downloader {
  constructor(scriptDetails, sender=null) {
    this.scriptDetails = null;
    this.scriptDownload = null;
    this.iconDownload = null;
    this.requireDownloads = [];
    this.resourceDownloads = {};

    this.errors = [];
    this.scriptDetails = scriptDetails;
    this.sender = sender;

    this.resolvePromise = null;
  }

  start(cb) {
    this.completionCallback = cb;

    this.scriptDownload
        = new Download(this, this.scriptDetails.downloadUrl, false);

    if (this.scriptDetails.iconUrl) {
      this.iconDownload
          = new Download(this, this.scriptDetails.iconUrl, true);
    }

    this.scriptDetails.requireUrls.forEach(u => {
      this.requireDownloads.push(new Download(this, u, false))
    });
    Object.keys(this.scriptDetails.resourceUrls).forEach(n => {
      let u = this.scriptDetails.resourceUrls[n];
      this.resourceDownloads[n] = new Download(this, u, true);
    });
  }

  get progress() {
    let p = this.scriptDownload.progress +
        (this.iconDownload ? this.iconDownload.progress : 0)
        + this.requireDownloads.map(d => d.progress).reduce((a, b) => a + b, 0);
        + Object.values(this.resourceDownloads)
              .map(d => d.progress).reduce((a, b) => a + b, 0);
    let t = 1 + (this.iconDownload ? 1 : 0)
        + this.requireDownloads.length
        + Object.keys(this.resourceDownloads).length;
    return p / t;
  }

  onLoad(download, event) {
    if (download.xhr.status == 0 || download.xhr.status >= 300) {
      this.errors.push(
          'Download error at ' + download.url
          + ': ' + event.target.status
          + ' (' + (event.target.statusText || 'Unknown') + ')');
    }

    if (!this.scriptDownload.pending
        && (!this.iconDownload || !this.iconDownload.pending)
        && !this.requireDownloads.filter(d => d.pending).length != 0
        && !Object.values(this.resourceDownloads)
              .filter(d => d.pending).length != 0
    ) {
      if (this.sender) browser.tabs.sendMessage(
          this.sender.tab.id,
          {
            'name': 'InstallProgress',
            'errors': this.errors,
            'progress': 1.0
          },
          {'frameId': this.sender.frameId});

      this.scriptDetails = parseUserScript(
          this.scriptDownload.xhr.responseText,
          this.scriptDownload.xhr.responseURL);

      this.completionCallback();
    }
  }

  onProgress(download, event) {
    if (this.sender) browser.tabs.sendMessage(
        this.sender.tab.id,
        {
          'name': 'InstallProgress',
          'errors': [],
          'progress': this.progress
        },
        {'frameId': this.sender.frameId});
  }
}
window.UserScriptDownloader = Downloader;


class Download {
  constructor(downloader, url, binary=false) {
    this._downloader = downloader;
    this.pending = true;
    this.progress = 0;
    this.url = url;

    this.xhr = new XMLHttpRequest();
    this.xhr.addEventListener('abort', this.onLoad.bind(this));
    this.xhr.addEventListener('error', this.onLoad.bind(this));
    this.xhr.addEventListener('load', this.onLoad.bind(this));
    this.xhr.addEventListener('progress', this.onProgress.bind(this));

    this.xhr.open('GET', url);
    if (binary) this.xhr.responseType = "blob";

    this.xhr.send();
  }

  onLoad(event) {
    this.pending = false;
    this._downloader.onLoad(this, event);
  }

  onProgress(event) {
    this.progress = event.lengthComputable
        ? event.loaded / event.total
        : 0;
    this._downloader.onProgress(this, event);
  }
}
window.Download = Download;

})();
