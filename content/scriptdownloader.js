// This anonymous function exists to isolate generic names inside it to its
// private scope.
var GM_ScriptDownloader;
(function() {

GM_ScriptDownloader = function(win, uri, bundle, contentWin) {
  this.win_ = win;
  this.uri_ = uri;
  this.bundle_ = bundle;

  // The window in which the script has been opened. Defaults to current tab.
  this.contentWindow_ = contentWin || null;

  this.req_ = null;
  this.script = null;
  this.depQueue_ = [];
  this.dependenciesLoaded_ = false;
  this.installOnCompletion_ = false;
  this.tempFiles_ = [];
  this.updateScript = false;
};

GM_ScriptDownloader.prototype.startInstall = function() {
  this.installing_ = true;
  this.startDownload();
};

GM_ScriptDownloader.prototype.startViewScript = function(uri) {
  this.installing_ = false;
  this.startDownload();
};

GM_ScriptDownloader.prototype.startDownload = function() {
  GM_getService().ignoreNextScript();

  this.req_ = new XMLHttpRequest();
  this.req_.overrideMimeType("text/plain");
  this.req_.open("GET", this.uri_.spec, true);
  this.req_.onreadystatechange = GM_hitch(this, "checkContentTypeBeforeDownload");
  this.req_.onload = GM_hitch(this, "handleScriptDownloadComplete");
  this.req_.send(null);
};

GM_ScriptDownloader.prototype._htmlTypeRegex = new RegExp('^text/(x|ht)ml', 'i');
GM_ScriptDownloader.prototype.checkContentTypeBeforeDownload = function () {
  if (2 != this.req_.readyState) return;

  if (this._htmlTypeRegex.test(this.req_.getResponseHeader("Content-Type"))
      && this.contentWindow_
  ) {
    // If there is a 'Content-Type' header and it contains 'text/html',
    // then do not install the file, display it instead.
    this.req_.abort();
    GM_getService().ignoreNextScript();
    this.contentWindow_.location.assign(this.uri_.spec);
  } else {
    // Otherwise, let the user know that the install is happening.
    var tools = {};
    Cu.import("resource://greasemonkey/GM_notification.js", tools);
    // TODO: localize
    tools.GM_notification("Fetching user script");
  }
};

GM_ScriptDownloader.prototype.handleScriptDownloadComplete = function() {
  try {
    // If loading from file, status might be zero on success
    if (this.req_.status != 200 && this.req_.status != 0) {
      // NOTE: Unlocalized string
      alert("Error loading user script:\n" +
      this.req_.status + ": " +
      this.req_.statusText);
      return;
    }

    var source = this.req_.responseText;

    this.script = GM_getConfig().parse(source, this.uri_);

    var file = Components.classes["@mozilla.org/file/directory_service;1"]
                         .getService(Components.interfaces.nsIProperties)
                         .get("TmpD", Components.interfaces.nsILocalFile);

    var base = this.script.name.replace(/[^A-Z0-9_]/gi, "").toLowerCase();
    file.append(base + ".user.js");
    file.createUnique(
      Components.interfaces.nsILocalFile.NORMAL_FILE_TYPE,
      0640
    );
    this.tempFiles_.push(file);

    var converter =
      Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
        .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
    converter.charset = "UTF-8";
    source = converter.ConvertFromUnicode(source);

    var ws = GM_getWriteStream(file);
    ws.write(source, source.length);
    ws.close();

    this.script.setDownloadedFile(file);

    window.setTimeout(GM_hitch(this, "fetchDependencies"), 0);

    if(this.installing_){
      this.showInstallDialog();
    }else{
      this.showScriptView();
    }
  } catch (e) {
    // NOTE: unlocalized string
    alert("Script could not be installed " + e);
    throw e;
  }
};

GM_ScriptDownloader.prototype.fetchDependencies = function(){
  GM_log("Fetching Dependencies");
  var deps = this.script.requires.concat(this.script.resources);

  // if this.script.icon has a url, then we need to download the image
  if (this.script.icon.hasDownloadURL()) {
    deps.push(this.script.icon);
  }

  for (var i = 0; i < deps.length; i++) {
    var dep = deps[i];
    if (this.checkDependencyURL(dep.urlToDownload)) {
      this.depQueue_.push(dep);
    } else {
      this.errorInstallDependency(this.script, dep,
        "SecurityException: Request to local and chrome url's is forbidden");
      return;
    }
  }
  this.downloadNextDependency();
};

GM_ScriptDownloader.prototype.downloadNextDependency = function(){
  if (this.depQueue_.length > 0) {
    var dep = this.depQueue_.pop();
    try {
      var persist = Components.classes[
        "@mozilla.org/embedding/browser/nsWebBrowserPersist;1"]
        .createInstance(Components.interfaces.nsIWebBrowserPersist);
      persist.persistFlags =
        persist.PERSIST_FLAGS_BYPASS_CACHE |
        persist.PERSIST_FLAGS_REPLACE_EXISTING_FILES; //doesn't work?
      var ioservice =
        Components.classes["@mozilla.org/network/io-service;1"]
        .getService(Components.interfaces.nsIIOService);
      var sourceUri = GM_uriFromUrl(dep.urlToDownload);
      var sourceChannel = ioservice.newChannelFromURI(sourceUri);
      sourceChannel.notificationCallbacks = new NotificationCallbacks();

      var file = GM_getTempFile();
      this.tempFiles_.push(file);

      var progressListener = new PersistProgressListener(persist);
      progressListener.onFinish = GM_hitch(this,
        "handleDependencyDownloadComplete", dep, file, sourceChannel);
      persist.progressListener = progressListener;

      persist.saveChannel(sourceChannel,  file);
    } catch(e) {
      GM_log("Download exception " + e);
      this.errorInstallDependency(this.script, dep, e);
    }
  } else {
    this.dependenciesLoaded_ = true;
    this.finishInstall();
  }
};

GM_ScriptDownloader.prototype.handleDependencyDownloadComplete =
function(dep, file, channel) {
  GM_log("Dependency Download complete " + dep.urlToDownload);
  try {
    var httpChannel =
      channel.QueryInterface(Components.interfaces.nsIHttpChannel);
  } catch(e) {
    var httpChannel = false;
  }

  if (httpChannel) {
    if (httpChannel.requestSucceeded) {
      if (this.updateScript) {
        dep._script = this.script;
        dep.updateScript = true;
      }

      // if the dependency type is icon, then check its mime type
      if (dep.type == "icon" && !dep.isImage(channel.contentType)) {
        this.errorInstallDependency(this.script, dep,
          "Error! @icon is not a image MIME type");
      }

      dep.setDownloadedFile(file, channel.contentType, channel.contentCharset ? channel.contentCharset : null);
      this.downloadNextDependency();
    } else {
      this.errorInstallDependency(this.script, dep,
        "Error! Server Returned : " + httpChannel.responseStatus + ": " +
        httpChannel.responseStatusText);
    }
  } else {
    dep.setDownloadedFile(file);
    this.downloadNextDependency();
  }
};

GM_ScriptDownloader.prototype.checkDependencyURL = function(url) {
  var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                            .getService(Components.interfaces.nsIIOService);
  var scheme = ioService.extractScheme(url);

  switch (scheme) {
    case "http":
    case "https":
    case "ftp":
        return true;
    case "file":
        var scriptScheme = ioService.extractScheme(this.uri_.spec);
        return (scriptScheme == "file");
    default:
      return false;
  }
};

GM_ScriptDownloader.prototype.finishInstall = function() {
  if (this.updateScript) {
    // Inject the script in all windows that have been waiting
    var pendingExec;
    var pendingExecAry = this.script.pendingExec;
    this.script.pendingExec = [];
    while (pendingExec = pendingExecAry.shift()) {
      if (pendingExec.safeWin.closed) continue;
      var url = pendingExec.safeWin.location.href;
      if (GM_scriptMatchesUrlAndRuns(this.script, url)) {
        GM_getService().injectScripts(
            [this.script], url, pendingExec.safeWin, pendingExec.chromeWin);
      }
    }

    // Save new values to config.xml
    GM_getConfig()._save();
  } else if (this.installOnCompletion_) {
    this.installScript();
  }
};

GM_ScriptDownloader.prototype.errorInstallDependency = function(script, dep, msg){
  GM_log("Error loading dependency " + dep.urlToDownload + "\n" + msg);
  if (this.installOnCompletion_) {
    alert("Error loading dependency " + dep.urlToDownload + "\n" + msg);
  } else {
    this.dependencyError = "Error loading dependency " + dep.urlToDownload + "\n" + msg;
  }
};

GM_ScriptDownloader.prototype.installScript = function(){
  if (this.dependencyError) {
    alert(this.dependencyError);
  } else if(this.dependenciesLoaded_) {
    this.win_.GM_BrowserUI.installScript(this.script);
  } else {
    this.installOnCompletion_ = true;
  }
};

GM_ScriptDownloader.prototype.cleanupTempFiles = function() {
  for (var i = 0, file = null; file = this.tempFiles_[i]; i++) {
    file.remove(false);
  }
};

GM_ScriptDownloader.prototype.showInstallDialog = function(timer) {
  if (!timer) {
    // otherwise, the status bar stays in the loading state.
    this.win_.setTimeout(GM_hitch(this, "showInstallDialog", true), 0);
    return;
  }
  this.win_.openDialog("chrome://greasemonkey/content/install.xul", "",
                       "chrome,centerscreen,modal,dialog,titlebar,resizable",
                       this);
};

GM_ScriptDownloader.prototype.showScriptView = function() {
  this.win_.GM_BrowserUI.showScriptView(this);
};

function NotificationCallbacks() {}

NotificationCallbacks.prototype.QueryInterface = function(aIID) {
  if (aIID.equals(Components.interfaces.nsIInterfaceRequestor)) {
    return this;
  }
  throw Components.results.NS_NOINTERFACE;
};

NotificationCallbacks.prototype.getInterface = function(aIID) {
  if (aIID.equals(Components.interfaces.nsIAuthPrompt )) {
     var winWat = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
                            .getService(Components.interfaces.nsIWindowWatcher);
     return winWat.getNewAuthPrompter(winWat.activeWindow);
  }
  return undefined;
};


function PersistProgressListener(persist) {
  this.persist = persist;
  this.onFinish = function(){};
  this.persiststate = "";
}

PersistProgressListener.prototype.QueryInterface = function(aIID) {
 if (aIID.equals(Components.interfaces.nsIWebProgressListener)) {
   return this;
 }
 throw Components.results.NS_NOINTERFACE;
};

// nsIWebProgressListener
PersistProgressListener.prototype.onProgressChange =
  PersistProgressListener.prototype.onLocationChange =
    PersistProgressListener.prototype.onStatusChange =
      PersistProgressListener.prototype.onSecurityChange = function(){};

PersistProgressListener.prototype.onStateChange =
  function(aWebProgress, aRequest, aStateFlags, aStatus) {
    if (this.persist.currentState == this.persist.PERSIST_STATE_FINISHED) {
      GM_log("Persister: Download complete " + aRequest.status);
      this.onFinish();
    }
  };

})();
