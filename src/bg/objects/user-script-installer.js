/* Install a new user script. One of these objects should  be created
 * when installing through navigation, file upload, or new script button */

class ScriptInstaller {
  constructor(scriptDetails, scriptContent, progressId=null) {
    // Script content is a string or a promise that will resolve a string */
    if (!scriptDetails) {
      throw new TypeError('Script Installer received no scriptDetails');
    }
    if (!scriptContent) {
      throw new TypeError('Script Installer received no scriptContent');
    }

    this.scriptDetails = scriptDetails;
    this.scriptContent = scriptContent;
    this.progressId = progressId;

    this._downloader = null;
    this._running = false;
    this._finished = false;
    this._saved = false;

    this._formatDownloadables();
  }

  abort() {
    this._downloader.abort();
  }

  run() {
    // Only run once
    if (this._running || this._finished) return this._runPromise;
    this._running = true;

    let allPromise = Promise.all([this._downloader.run(), this.scriptContent]);
    this._runPromise = allPromise.then(items => {
      // items = [downloadDetails, scriptContent]
      this._applyDownloadDetails(items[0], items[1]);
      this._running = false;
      this._finished = true;
    }).catch(this._handleError.bind(this));

    return this._runPromise;
  }

  async save() {
    if (!this._finished) {
      if (this._running) {
        await this._runPromise;
      } else {
        await this.run();
      }
    }

    // Only save once
    if (this._saved) return this.scriptDetails;

    let userScript = new EditableUserScript(this.scriptDetails);
    this.scriptDetails.uuid = userScript.uuid;

    await UserScriptRegistry.saveUserScript(userScript);
    this._saved = true;

    return this.scriptDetails;
  }

  // This this is a new script, just apply everything directly to scriptDetails
  _applyDownloadDetails(downloadDetails, scriptContent) {
    this.scriptDetails.iconBlob = downloadDetails.iconBlob || null;
    this.scriptDetails.requiresContent = downloadDetails.requiresContent;
    this.scriptDetails.resources = downloadDetails.resources;
    this.scriptDetails.content = scriptContent;
  }

  _formatDownloadables() {
    let contentInfo = [];

    this._formatIconDownloadables(contentInfo);
    this._formatRequireDownloadables(contentInfo);
    this._formatResourceDownloadables(contentInfo);

    this._downloader = new ScriptDownloader(contentInfo, this.progressId);
  }

  // If an icon url is provided then format the request to download
  _formatIconDownloadables(contentInfo) {
    if (this.scriptDetails.iconUrl) {
      contentInfo.push({'type': 'icon', 'url': this.scriptDetails.iconUrl});
    }
  }

  // For each require entry format the download request
  _formatRequireDownloadables(contentInfo) {
    let requireUrls = this.scriptDetails.requireUrls;
    if (!requireUrls || !requireUrls.length) return;

    requireUrls.forEach(url => {
      contentInfo.push({'type': 'require', 'url': url});
    });
  }

  // For each resource entry format the download request
  _formatResourceDownloadables(contentInfo) {
    let resourceUrls = this.scriptDetails.resourceUrls;
    if (!resourceUrls) return;

    let resourceKeys = Object.getOwnPropertyNames(resourceUrls);
    if (!resourceKeys.length) return;

    resourceKeys.forEach(key => {
      contentInfo.push({
        'type': 'resource',
        'url': resourceUrls[key],
        'key': key
      });
    });
  }

  _handleError(err) {
    // Failure. Set the state so that it can't be saved.
    this._running = false;
    this._saved = this._finished = true;

    if (err instanceof DOMException && err.name == 'AbortError') {
      console.log('Userscript install aborted by user:',
                  this.scriptDetails.downloadUrl);
    } else {
      // Abort everything.
      this.abort();

      // TODO: Handle other errors?
      console.error('Error installing script:', err);
    }
    // Propagate so that other things can deal with the errors.
    throw err;
  }
}

// ######################### GLOBAL MESSAGES ########################### \\

(function() {

// Message listener for script install based on details and content
function onUserScriptInstall(message, sender, sendResponse) {
  if (!message.content) {
    console.error('onUserScriptInstall got no content');
    return;
  }

  let details = message.details;
  if (!details) {
    details = parseUserScript(message.content);
  }

  let installer = new ScriptInstaller(details, message.content);
  return installer.save();
}
window.onUserScriptInstall = onUserScriptInstall;

})();
