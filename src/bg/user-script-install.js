/// Receive a UserScriptInstall message.
function onUserScriptInstall(message, sender, sendResponse) {
  let downloader = new Downloader(message.details, sender);
  downloader.start(function() {
    console.log('Complete, downloads:');
    console.group();
    downloader.downloads.forEach(d => { console.log(d.url); console.log(d.xhr) });
    console.groupEnd();
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

  onAbort(download, event) {
    console.warn('abort?', event);
    this.onLoad(download, event);
  }

  onError(download, event) {
    console.warn('error?', event);
    this.errors.push(
        'Download error at ' + download.url
        + ': ' + event.target.status + ' ' + event.target.statusText);
    this.onLoad(download, event);
  }

  onLoad(download, event) {
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
    this.xhr.addEventListener('abort', this.onAbort.bind(this));
    this.xhr.addEventListener('error', this.onError.bind(this));
    this.xhr.addEventListener('load', this.onLoad.bind(this));
    this.xhr.addEventListener('progress', this.onProgress.bind(this));

    this.xhr.open('GET', url);
    // Force binary?
    if (binary) {
      this.xhr.responseType = "blob";
    }

    this.xhr.send();
  }

  onAbort(event) {
    this.pending = false;
    this._downloader.onAbort(this, event);
  }

  onError(event) {
    this.pending = false;
    this._downloader.onError(this, event);
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

