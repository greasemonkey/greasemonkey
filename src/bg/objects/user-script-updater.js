/* Class that handles updating a user script after saving. */

class ScriptUpdater {
  constructor(
      currentScript,
      scriptDetails=null,
      scriptContent=null,
      progressId=null
  ) {
    if (!currentScript) {
      throw new TypeError('Script Updater received no currentScript');
    }

    this.currentScript = currentScript;
    this.progressId = progressId;

    // If scriptDetails and scriptContent are not passed to the constructor
    // then an attempt to update the script will be made using the stored
    // `downloadURL` in order to fetch the content.
    if (!scriptDetails || !scriptContent) {
      this._fetchContent();
      this._auto = true;
    } else {
      this.scriptDetails = scriptDetails;
      this.scriptContent = scriptContent;
      this._auto = false;
    }

    this._downloader = null;
    this._running = false;
    this._finished = false;
    this._saved = false;

    this._formatPromise = this._formatDownloadables();
  }

  abort() {
    this._formatPromise.then(() => this._downloader.abort());
  }

  run() {
    // Only run once
    if (this._running || this._finished) return this._runPromise;
    this._running = true;

    let allPromise = this._formatPromise
        .then(() => Promise.all([this._downloader.run(), this.scriptContent]));

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

    let newScript = new EditableUserScript(this.scriptDetails);
    if (this._checkScriptEquivalence(newScript)) {
      // They're the same, this is a no-op
      // Set flags so that it cannot be saved
      this._saved = true;
      return this.scriptDetails;
    }

    await UserScriptRegistry.saveUserScript(newScript);
    this._saved = true;

    // Check if this was an auto update (future proof, not yet implemented)
    // and that the script was updated. If so, pop a notification.
    if (this._auto) {
      chrome.notifications.create({
        'iconUrl': '/skin/icon.svg',
        'type': 'basic',
        'title': _('Script Updated'),
        'message': newScript.id,
      }, notificationId => {
        new ScriptSaveNotification(this.scriptDetails.uuid, notificationId);
      });
    }

    return this.scriptDetails;
  }

  update() {
    // Alias for save
    return this.save();
  }

  _applyDownloadDetails(downloadDetails, scriptContent) {
    let scriptDetails = this.scriptDetails;

    // Merge download details with the current details
    // TODO: Merge other things? Make merging more 'automatic?'
    scriptDetails.uuid = this.currentScript.uuid;
    scriptDetails.iconBlob = downloadDetails.iconBlob || null;
    scriptDetails.downloadUrl =
        scriptDetails.downloadUrl || this.currentScript.downloadUrl;

    Object.assign(scriptDetails.requiresContent,
                  downloadDetails.requiresContent);
    Object.assign(scriptDetails.resources, downloadDetails.resources);

    scriptDetails.content =
        // passed argument or old content
        scriptContent || this.currentScript.content;
  }

  _fetchContent() {
    if (!this.currentScript.downloadUrl) {
      throw new TypeError(
        'A script attempted auto-update without downloadUrl');
    }

    // Get the content first.
    this.scriptContent =
        (new Download(this.currentScript.downloadUrl, false)).run();
    this.scriptDetails =
        this.scriptContent.then(result => parseUserScript(result));
  }

  async _formatDownloadables() {
    this.scriptDetails = await this.scriptDetails;
    let contentInfo = [];

    this._formatIconDownloadables(contentInfo);
    this._formatRequireDownloadables(contentInfo);
    this._formatResourceDownloadables(contentInfo);

    this._downloader = new ScriptDownloader(contentInfo);
  }

  // If an icon url is provided then format the request to download
  _formatIconDownloadables(contentInfo) {
    if (this.scriptDetails.iconUrl) {
      contentInfo.push({'type': 'icon', 'url': this.scriptDetails.iconUrl});
    }
  }

  // Go through each requireUrl in scriptDetail and check if the content is
  // already available. If so  then copy it into requiresContent. If the
  // content is not available then add it to the download queue.
  _formatRequireDownloadables(contentInfo) {
    let passedReqContent = this.scriptDetails.requiresContent || {};
    let requiresContent = this.scriptDetails.requiresContent = {};

    let requireUrls = this.scriptDetails.requireUrls;
    if (!requireUrls || !requireUrls.length) return;

    let oldReqContent = this.currentScript.requiresContent;
    requireUrls.forEach(url => {
      if (passedReqContent[url] || oldReqContent[url]) {
        requiresContent[url] = passedReqContent[url] || oldReqContent[url]
      } else {
        contentInfo.push({'type': 'require', 'url': url});
      }
    });
  }

  // Go through each resourceUrl in scriptDetail and check if the key / url
  // pair is already available. If so then copy it into resources. If the
  // content is not available then add it to the download queue.
  _formatResourceDownloadables(contentInfo) {
    let passedResources = this.scriptDetails.resources || {};
    let resources = this.scriptDetails.resources = {};

    let resourceUrls = this.scriptDetails.resourceUrls;
    if (!resourceUrls) return;

    let resourceKeys = Object.getOwnPropertyNames(resourceUrls);
    if (!resourceKeys.length) return;

    let oldResources = this.currentScript.resources;
    resourceKeys.forEach(key => {
      let keyUrl = resourceUrls[key];
      if (passedResources[key] && passedResources[key].url == keyUrl) {
        // Copy over
        resources[key] = passedResources[key];
      } else if (oldResources[key] && oldResources[key].url == keyUrl) {
        // Copy over
        resources[key] = oldResources[key];
      } else {
        contentInfo.push({
          'type': 'resource',
          'url': keyUrl,
          'key': key
        });
      }
    });
  }

  _checkScriptEquivalence(newScript) {
    let newDetails = newScript.details;
    let oldDetails = this.currentScript.details;

    // Remove keys that don't matter for comparison
    delete newDetails['evalContent'];
    delete newDetails['evalContentVersion'];
    delete oldDetails['evalContent'];
    delete oldDetails['evalContentVersion'];

    return JSON.stringify(newDetails) == JSON.stringify(oldDetails);
  }

  _handleError(err) {
    // Failure. Set the state so that it can't be saved.
    this._running = false;
    this._saved = this._finished = true;
    let id = this.scriptDetails.namespace + '/' + this.scriptDetails.name;

    if (err instanceof DOMException && err.name == 'AbortError') {
      console.log('Userscript update aborted by user:', id);
    } else {
      // Abort everything.
      this.abort();

      // TODO: Handle other errors?
      console.error('Error updating script:', err);
    }
    // Propagate so that other things can deal with the errors.
    throw err;

  }
}

// ######################### GLOBAL MESSAGES ########################### \\

(function() {

// Message listener for updating a script from the edtior
function onUserScriptUpdate(message, sender, sendResponse) {
  if (!message.uuid) {
    console.error('onUserScriptUpdate got no UUID.');
    return;
  } else if (!message.content) {
    console.error('onUserScriptUpdate got no content.');
    return;
  }

  let details = message.details;
  if (!details) {
    details = parseUserScript(message.content);
  }
  // This will throw an error if the script does not exist.
  let userScript = UserScriptRegistry.scriptByUuid(message.uuid);
  let updater = new ScriptUpdater(userScript, details, message.content);
  return updater.update();
}
window.onUserScriptUpdate = onUserScriptUpdate;

})();
