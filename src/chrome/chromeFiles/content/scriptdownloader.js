function ScriptDownloader(win, uri, bundle) {
  this.win_ = win;
  this.uri_ = uri;
  this.bundle_ = bundle;
  this.req_ = null;
  this.script = null;
}

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

  Components.classes["@greasemonkey.mozdev.org/greasemonkey-service;1"]
  .getService().wrappedJSObject
  .ignoreNextScript();

  this.req_ = new XMLHttpRequest();
  this.req_.open("GET", this.uri_.spec, true);
  this.req_.onload = GM_hitch(this, "handleDownloadComplete");
  this.req_.send(null);
};

ScriptDownloader.prototype.handleDownloadComplete = function() {
  this.win_.GM_BrowserUI.refreshStatus();

  // If loading from file, status might be zero on success
  if (this.req_.status != 200 && this.req_.status != 0) {
    alert("Error loading user script:\n" + 
	  this.req_.status + ": " + 
	  this.req_.statusText);
    return;
  }

  var source = this.req_.responseText;

  this.parseScript_(source, this.uri_);

  var file = Components.classes["@mozilla.org/file/directory_service;1"]
        .getService(Components.interfaces.nsIProperties)
        .get("TmpD", Components.interfaces.nsILocalFile);

  var base = this.script.name.replace(/[^A-Z0-9_]/gi, "").toLowerCase();
  file.append(base + ".user.js");

  var ws = getWriteStream(file);
  ws.write(source, source.length);
  ws.close();

  this.script.file = file;
  this.win_.GM_BrowserUI.hideStatus();

  if (this.installing_) {
    this.showInstallDialog();
  } else {
    this.showScriptView();
  }
};

ScriptDownloader.prototype.showInstallDialog = function(timer) {
  if (!timer) {
    // otherwise, the status bar stays in the loading state.
    this.win_.setTimeout(GM_hitch(this, "showInstallDialog", true), 0);
    return;
  }

  this.win_.openDialog("chrome://greasemonkey/content/install.xul", "", 
		       "chrome,centerscreen,modal,dialog,titlebar,resizable",
		       this);
};

ScriptDownloader.prototype.showScriptView = function() {
  this.win_.GM_BrowserUI.showScriptView(this);
};

ScriptDownloader.prototype.parseScript_ = function(source, uri) {
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

  while (result = lines[lnIdx++]) {
    if (result.indexOf("// ==UserScript==") == 0) {
      GM_log("* found metadata");
      foundMeta = true;
      break;
    }
  }
  
  // gather up meta lines
  if (foundMeta) {
    while (result = lines[lnIdx++]) {
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
