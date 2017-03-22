// Private implementation.
(function() {

/// Receive a UserScriptInstall message.
window.onUserScriptInstall = function(message, sender, sendResponse) {
  let downloader = new Downloader(message.details, sender);
  downloader.start(function() {
    console.log('Complete, downloads:');
    console.group();
    downloader.downloads.forEach(d => { console.log(d.url); console.log(d.xhr) });
    console.groupEnd();
    console.log('Download errors:', downloader.errors);

    if (downloader.errors) return;
  });
}


class Downloader {
  constructor(scriptDetails, sender) {
    this.downloads = [];
    this.errors = [];
    this.scriptDetails = scriptDetails;
    this.sender = sender;

    this.resolvePromise = null;
  }

  start(cb) {
    this.completionCallback = cb;

    // TODO: Use messaging to grab the script from the content window instead?
    this.addDownload(this.scriptDetails.downloadUrl);

    if (this.scriptDetails.iconUrl) {
      this.addBinaryDownload(this.scriptDetails.iconUrl)
    }

    this.scriptDetails.requireUrls.forEach(u => this.addDownload(u));
    Object.values(this.scriptDetails.resourceUrls)
        .forEach(u => this.addBinaryDownload(u));
  }

  get progress() {
    let p = this.downloads.map(d => d.progress).reduce((a, b) => a + b);
    let t = this.downloads.length;
    return p / t;
  }

  addBinaryDownload(url) {
    this.downloads.push(new Download(this, url, true));
  }

  addDownload(url) {
    this.downloads.push(new Download(this, url, false));
  }

  onLoad(download, event) {
    if (download.xhr.status == 0 || download.xhr.status >= 300) {
      this.errors.push(
          'Download error at ' + download.url
          + ': ' + event.target.status
          + ' (' + (event.target.statusText || 'Unknown') + ')');
    }

    if (this.downloads.filter(d => d.pending).length != 0) {
      // Something is still pending, wait!
      return;
    }

    browser.tabs.sendMessage(
        this.sender.tab.id,
        {
          'name': 'InstallProgress',
          'errors': this.errors,
          'progress': 1.0
        },
        {'frameId': this.sender.frameId});

    this.completionCallback();
  }

  onProgress(download, event) {
    browser.tabs.sendMessage(
        this.sender.tab.id,
        {
          'name': 'InstallProgress',
          'errors': [],
          'progress': this.progress
        },
        {'frameId': this.sender.frameId});
  }
}


class Download {
  constructor(downloader, url, binary) {
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
    // Force binary?
    if (binary) {
      this.xhr.responseType = "blob";
    }

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

})();
