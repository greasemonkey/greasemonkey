function ScriptDownloader(win, uri, bundle) {
  this.win_ = win;
  this.uri_ = uri;
  this.bundle_ = bundle;
  this.req_ = null;
  this.script = null;
  this.depQueue_ = [];
  this.dependenciesLoaded_ = false;
  this.installOnCompletion_ = false;
};

ScriptDownloader.prototype.startInstall = function() {
  this.installing_ = true;
  this.startDownload();
};

ScriptDownloader.prototype.startViewScript = function(uri) {
  this.installing_ = false;
  this.startDownload();
};

ScriptDownloader.prototype.startDownload = function() {
  this.win_.GM_BrowserUI.statusImage.src = "chrome://global/skin/throbber/Throbber-small.gif";
  this.win_.GM_BrowserUI.statusImage.style.opacity = "0.5";
  this.win_.GM_BrowserUI.statusImage.tooltipText = this.bundle_.getString("tooltip.loading");

  this.win_.GM_BrowserUI.showStatus("Fetching user script", false);

  Components.classes["@greasemonkey.mozdev.org/greasemonkey-service;1"]
    .getService().wrappedJSObject
    .ignoreNextScript();

  this.req_ = new XMLHttpRequest();
  this.req_.open("GET", this.uri_.spec, true);
  this.req_.onload = GM_hitch(this, "handleScriptDownloadComplete");
  this.req_.send(null);
};

ScriptDownloader.prototype.handleScriptDownloadComplete = function() {
  try {
    // If loading from file, status might be zero on success
    if (this.req_.status != 200 && this.req_.status != 0) {
      this.win_.GM_BrowserUI.refreshStatus();
      this.win_.GM_BrowserUI.hideStatus();

      // NOTE: Unlocalized string
      alert('Error loading user script:\n' +
      this.req_.status + ": " +
      this.req_.statusText);
      return;
    }

    var source = this.req_.responseText;

    this.parseScript(source, this.uri_);

    var file = Components.classes["@mozilla.org/file/directory_service;1"]
                         .getService(Components.interfaces.nsIProperties)
                         .get("TmpD", Components.interfaces.nsILocalFile);

    var base = this.script.name.replace(/[^A-Z0-9_]/gi, "").toLowerCase();
    file.append(base + ".user.js");

    var converter =
      Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
        .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
    converter.charset = "UTF-8";
    source = converter.ConvertFromUnicode(source);

    var ws = getWriteStream(file);
    ws.write(source, source.length);
    ws.close();

    this.script.file = file;

    window.setTimeout(GM_hitch(this, "fetchDependencies"), 0);

    if(this.installing_){
      this.showInstallDialog();
    }else{
      this.showScriptView();
    }
  } catch (e) {
    // NOTE: unlocalized string
    alert("Script could not be installed " + e);
    this.win_.GM_BrowserUI.refreshStatus();
    this.win_.GM_BrowserUI.hideStatus();
    throw e;
  }
};

ScriptDownloader.prototype.fetchDependencies = function(){
  GM_log("Fetching Dependencies");
  var deps = this.script.requires.concat(this.script.resources);
  for (var i = 0; i < deps.length; i++) {
    var dep = deps[i];
    if (this.checkDependencyURL(dep.url)) {
      this.depQueue_.push(dep);
    } else {
      this.errorInstallDependency(this.script, dep,
        "SecurityException: Request to local and chrome url's is forbidden");
      return;
    }
  }
  this.downloadNextDependency();
};

ScriptDownloader.prototype.downloadNextDependency = function(){
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
        .getService();
      var sourceUri = ioservice.newURI(dep.url, null, null);
      var sourceChannel = ioservice.newChannelFromURI(sourceUri);
      sourceChannel.notificationCallbacks = new NotificationCallbacks();

      var file = getTempFile();

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

ScriptDownloader.prototype.handleDependencyDownloadComplete =
function(dep, file, channel) {
  GM_log("Dependency Download complete " + dep.url);
  try {
    var httpChannel =
      channel.QueryInterface(Components.interfaces.nsIHttpChannel);
  } catch(e) {
    var httpChannel = false;
  }

  if (httpChannel) {
    if (httpChannel.requestSucceeded) {
      dep.file = file;
      dep.mimetype= channel.contentType;
      if (channel.contentCharset) {
        dep.charset = channel.contentCharset;
      }
      this.downloadNextDependency();
    } else {
      this.errorInstallDependency(this.script, dep,
        "Error! Server Returned : " + httpChannel.responseStatus + ": " +
        httpChannel.responseStatusText);
    }
  } else {
    dep.file = file;
    this.downloadNextDependency();
  }
};

ScriptDownloader.prototype.checkDependencyURL = function(url) {
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
        return (scriptScheme == "file")
    default:
      return false;
  }
};

ScriptDownloader.prototype.finishInstall = function(){
  if (this.installOnCompletion_) {
    this.installScript();
  }
};

ScriptDownloader.prototype.errorInstallDependency = function(script, dep, msg){
  GM_log("Error loading dependency " + dep.url + "\n" + msg)
  if (this.installOnCompletion_) {
    alert("Error loading dependency " + dep.url + "\n" + msg);
  } else {
    this.dependencyError = "Error loading dependency " + dep.url + "\n" + msg;
  }
};

ScriptDownloader.prototype.installScript = function(){
  if (this.dependencyError) {
    alert(this.dependencyError);
  } else if(this.dependenciesLoaded_) {
    this.win_.GM_BrowserUI.installScript(this.script)
  } else {
    this.installOnCompletion_ = true;
  }
};

ScriptDownloader.prototype.showInstallDialog = function(timer) {
  if (!timer) {
    // otherwise, the status bar stays in the loading state.
    this.win_.setTimeout(GM_hitch(this, "showInstallDialog", true), 0);
    return;
  }
  this.win_.GM_BrowserUI.hideStatus();
  this.win_.GM_BrowserUI.refreshStatus();
  this.win_.openDialog("chrome://greasemonkey/content/install.xul", "",
                       "chrome,centerscreen,modal,dialog,titlebar,resizable",
                       this);
};

ScriptDownloader.prototype.showScriptView = function() {
  this.win_.GM_BrowserUI.hideStatus();
  this.win_.GM_BrowserUI.refreshStatus();
  this.win_.GM_BrowserUI.showScriptView(this);
};

ScriptDownloader.prototype.parseScript = function(source, uri) {
  var ioservice = Components.classes["@mozilla.org/network/io-service;1"]
                            .getService();

  var script = new Script();
  script.uri = uri;
  script.enabled = true;
  script.includes = [];
  script.excludes = [];

  // read one line at a time looking for start meta delimiter or EOF
  var lines = source.match(/.+/g);
  var lnIdx = 0;
  var result = {};
  var foundMeta = false;

  while ((result = lines[lnIdx++])) {
    if (result.indexOf("// ==UserScript==") == 0) {
      foundMeta = true;
      break;
    }
  }

  // gather up meta lines
  if (foundMeta) {
    // used for duplicate resource name detection
    var previousResourceNames = {};

    while ((result = lines[lnIdx++])) {
      if (result.indexOf("// ==/UserScript==") == 0) {
        break;
      }

      var match = result.match(/\/\/ \@(\S+)\s+([^\n]+)/);
      if (match != null) {
        switch (match[1]) {
          case "name":
          case "namespace":
          case "description":
            script[match[1]] = match[2];
            break;
          case "include":
          case "exclude":
            script[match[1]+"s"].push(match[2]);
            break;
          case "require":
            var reqUri = ioservice.newURI(match[2], null, uri);
            var scriptDependency = new ScriptDependency();
            scriptDependency.url = reqUri.spec;
            script.requires.push(scriptDependency);
            break;
          case "resource":
            var res = match[2].match(/(\S+)\s+(.*)/);
            if (res === null) {
              // NOTE: Unlocalized strings
              throw new Error("Invalid syntax for @resource declaration '" +
                              match[2] + "'. Resources are declared like: " +
                              "@resource <name> <url>.");
            }

            var resName = res[1];
            if (previousResourceNames[resName]) {
              throw new Error("Duplicate resource name '" + resName + "' " +
                              "detected. Each resource must have a unique " +
                              "name.");
            } else {
              previousResourceNames[resName] = true;
            }

            var resUri = ioservice.newURI(res[2], null, uri);
            var scriptResource = new ScriptResource();
            scriptResource.name = resName;
            scriptResource.url = resUri.spec;
            script.resources.push(scriptResource);
            break;
        }
      }
    }
  }

  // if no meta info, default to reasonable values
  if (script.name == null) {
    script.name = parseScriptName(uri);
  }

  if (script.namespace == null) {
    script.namespace = uri.host;
  }

  if (script.includes.length == 0) {
    script.includes.push("*");
  }

  this.script = script;
};


function NotificationCallbacks() {
};

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


function PersistProgressListener(persist){
  this.persist = persist;
  this.onFinish = function(){};
  this.persiststate = "";
};

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