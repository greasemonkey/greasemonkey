/* Download content from the provided URLS */

class ScriptDownloader {
  constructor(contentInfo, progressId=null) {
    this.contentInfo = contentInfo;
    this.progressId = progressId;

    this._downloads = new Map();
    this._scriptDetails = {'requiresContent': {}, 'resources': {}};
  }

  run() {
    let downloads =
        this.contentInfo.map(cInfo => {
          let download = this._buildDownload(cInfo);
          return download.run()
              .then(this._wrapFunction(this._handleResult, cInfo));
        });

    return Promise.all(downloads).then(() => {
      // One last progress report
      if (this.progressId) {
        let progress = Array(this._downloads.size).fill(1);
        ScriptInstall.reportDownloadProgress(this.progressId, progress);
      }
      return this._scriptDetails;
    });
  }

  abort() {
    this._downloads.forEach(download => download.abort());
  }

  sendProgress() {
    if (!this.progressId) return;
    let progress = [];
    this._downloads.forEach(download => progress.push(download.progress));
    ScriptInstall.reportDownloadProgress(this.progressId, progress);
  }

  _buildDownload(cInfo) {
    let download;
    switch (cInfo.type) {
      case 'require':
        // Fetch as a string
        download = new Download(cInfo.url, false, this);
        break;
      case 'icon':
      case 'resource':
        // Fetch as a blob
        download = new Download(cInfo.url, true, this);
        break;
    }
    this._downloads.set(cInfo, download);
    return download;
  }

  // Format script details based on the items that were downloaded
  _handleResult(result, cInfo) {
    switch (cInfo.type) {
      case 'icon':
        this._scriptDetails.iconBlob = result;
        break;

      case 'require':
        this._scriptDetails.requiresContent[cInfo.url] = result;
        break;

      case 'resource':
        this._scriptDetails.resources[cInfo.key] = {
          'name': cInfo.key,
          'mimetype': this._downloads.get(cInfo).contentType,
          'url': cInfo.url,
          'blob': result
        };
        break;
    }
  }

  _wrapFunction(fn, ...args) {
    return data => {
      if (data !== undefined) {
        args.unshift(data);
      }
      return fn.apply(this, args);
    };
  }
}


class Download {
  constructor(url, blob, downloader=null) {
    this.url = url;
    this.blob = blob;
    this.downloader = downloader;
    this.progress = 0;

    this._xhr = null;
  }

  abort() {
    this._xhr.abort();
  }

  run() {
    return new Promise((resolve, reject) => {
      this._xhr = new XMLHttpRequest();
      this._xhr.responseType = this.blob ? 'blob' : "";
      this._xhr.open('GET', this.url);

      this._xhr.onabort =
        this._wrapFunction(this._handleAbort, resolve, reject);
      this._xhr.onerror =
        this._wrapFunction(this._handleError, resolve, reject);
      this._xhr.onload =
        this._wrapFunction(this._handleLoad, resolve, reject);
      this._xhr.onprogress =
        this._wrapFunction(this._handleProgress);
      this._xhr.ontimeout =
        this._wrapFunction(this._handleTimeout, resolve, reject);

      this._xhr.send();
    });
  }

  get contentType() {
    return this._xhr.getResponseHeader('Content-Type');
  }

  _handleAbort(event, resolve, reject) {
    let abort = new DOMException('Download aborted.', 'AbortError');
    reject(abort);
  }

  _handleError(event, resolve, reject) {
    // TODO: Can we figure out cleaner way to handle other errors?
    reject(event);
  }

  _handleLoad(event, resolve, reject) {
    if (200 <= this._xhr.status && this._xhr.status <= 299) {
      this._setProgress(1);
      resolve(this._xhr.response);
    } else if (404 == this._xhr.status) {
      let error =
          new DOMException('Resource not found: ' + this.url, 'NotFoundError');
      reject(error);
    } else {
      let error =
          new Error('Unkown Error occured during download: ' + this.url);
      reject(error);
    }
  }

  _handleProgress(event) {
    if (event.lengthComputable) {
      this._setProgress(event.loaded / event.total);
    }
  }

  _handleTimeout(event, resolve, reject) {
    let timeout =
        new DOMException('Resource timed out: ' + this.url, 'TimeoutError');
    reject(timeout);
  }

  _setProgress(progress) {
    this.progress = progress;
    if (this.downloader) {
      this.downloader.sendProgress();
    }
  }

  _wrapFunction(fn, ...args) {
    return data => {
      if (data !== undefined) {
        args.unshift(data);
      }
      return fn.apply(this, args);
    };
  }
}
