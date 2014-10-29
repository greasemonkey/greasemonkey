var EXPORTED_SYMBOLS = ['Script'];

Components.utils.import('resource://gre/modules/AddonManager.jsm');
Components.utils.import('resource://greasemonkey/GM_notification.js');
Components.utils.import('resource://greasemonkey/constants.js');
Components.utils.import('resource://greasemonkey/extractMeta.js');
Components.utils.import('resource://greasemonkey/ipcscript.js');
Components.utils.import('resource://greasemonkey/miscapis.js');
Components.utils.import("resource://greasemonkey/parseScript.js");
Components.utils.import('resource://greasemonkey/prefmanager.js');
Components.utils.import('resource://greasemonkey/scriptIcon.js');
Components.utils.import('resource://greasemonkey/scriptRequire.js');
Components.utils.import('resource://greasemonkey/scriptResource.js');
Components.utils.import('resource://greasemonkey/third-party/MatchPattern.js');
Components.utils.import('resource://greasemonkey/third-party/convert2RegExp.js');
Components.utils.import('resource://greasemonkey/util.js');

var stringBundle = Components
    .classes["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .createBundle("chrome://greasemonkey/locale/greasemonkey.properties");

var GM_GUID = "{e4a8a97b-f2ed-450b-b12d-ee082ba24781}";
var gGreasemonkeyVersion = 'unknown';
Components.utils.import("resource://gre/modules/AddonManager.jsm");
AddonManager.getAddonByID(GM_GUID, function(addon) {
  gGreasemonkeyVersion = '' + addon.version;
});

var gAboutBlankRegexp = /^about:blank/;

function Script(configNode) {
  this._observers = [];

  this._basedir = null;
  this._dependFail = false;
  this._dependhash = null;
  this._description = '';
  this._downloadURL = null;
  this._enabled = true;
  this._excludes = [];
  this._filename = null;
  this._grants = [];
  this._icon = new ScriptIcon(this);
  this._id = null;
  this._installTime = null;
  this._includes = [];
  // All available localized properties.
  this._locales = {};
  // The best localized matches for the current browser locale.
  this._localized = null;
  this._matches = [];
  this._modifiedTime = null;
  this._name = 'user-script';
  this._namespace = '';
  this._noframes = false;
  this._rawMeta = '';
  this._requires = [];
  this._resources = [];
  this._runAt = null;
  this._tempFile = null;
  this._updateURL = null;
  this._updateMetaStatus = 'unknown';
  this._userExcludes = [];
  this._userIncludes = [];
  this._uuid = [];
  this._version = null;

  this.checkRemoteUpdates = AddonManager.AUTOUPDATE_DEFAULT;
  this.needsUninstall = false;
  this.parseErrors = [];
  this.pendingExec = [];
  this.availableUpdate = null;

  if (configNode) this._loadFromConfigNode(configNode);
}

Script.prototype.matchesURL = function(url) {
  var uri = GM_util.uriFromUrl(url);

  function testClude(glob) {
    // Do not run in about:blank unless _specifically_ requested.  See #1298
    if (gAboutBlankRegexp.test(url) && !gAboutBlankRegexp.test(glob)) {
      return false;
    }

    return GM_convert2RegExp(glob, uri).test(url);
  }
  function testMatch(matchPattern) {
    return matchPattern.doMatch(url);
  }

  // Flat deny if URL is not greaseable, or matches global excludes.
  if (!GM_util.isGreasemonkeyable(url)) return false;
  if (GM_util.getService().config._globalExcludes.some(testClude)) return false;

  // Allow based on user cludes.
  if (this._userExcludes.some(testClude)) return false;
  if (this._userIncludes.some(testClude)) return true;

  // Finally allow based on script cludes and matches.
  if (this._excludes.some(testClude)) return false;
  return (this._includes.some(testClude) || this._matches.some(testMatch));
};

Script.prototype._changed = function(event, data) {
  var dontSave = ('val-set' == event || 'val-del' == event);
  GM_util.getService().config._changed(this, event, data, dontSave);
};
// TODO: Move this method to be public rather than just aliasing it.
Script.prototype.changed = Script.prototype._changed;

Script.prototype.__defineGetter__('installDate',
function Script_getInstallDate() { return new Date(this._installTime); });

Script.prototype.__defineGetter__('modifiedDate',
function Script_getModifiedDate() { return new Date(this._modifiedTime); });

Script.prototype.__defineGetter__('name',
function Script_getName() { return this._name; });

Script.prototype.__defineGetter__('namespace',
function Script_getNamespace() { return this._namespace; });

Script.prototype.__defineGetter__('id',
function Script_getId() {
  if (!this._id) this._id = this._namespace + "/" + this._name;
  return this._id;
});

// TODO: Remove this with pref -> db migration code.
Script.prototype.__defineGetter__('prefroot',
function Script_getPrefroot() {
  if (!this._prefroot) this._prefroot = ["scriptvals.", this.id, "."].join("");
  return this._prefroot;
});

Script.prototype.__defineGetter__('dependencies',
function Script_getDependencies() {
  var deps = this.requires.concat(this.resources);
  if (this.icon.downloadURL) deps.push(this.icon);
  return deps;
});

Script.prototype.__defineGetter__('description',
function Script_getDescription() { return this._description; });

Script.prototype.__defineGetter__('localized',
function Script_getLocalizedDescription() {
  // We can't simply return this._locales[locale], as the best match for name
  // and description might be for different locales (e.g. if an exact match is
  // only provided for one of them).
  function getBestLocalization(aProp) {
    var available = Object.keys(locales).filter(function(locale) {
      return !!locales[locale][aProp];
    });

    var bestMatch = GM_util.getBestLocaleMatch(preferred, available);
    if (!bestMatch) return null;

    return locales[bestMatch][aProp];
  }

  if (!this._localized) {
    var locales = this._locales;
    var preferred = GM_util.getPreferredLocale();

    this._localized = {
      description: getBestLocalization("description") || this._description,
      name: getBestLocalization("name") || this._name
    };
  }

  return this._localized;
});

Script.prototype.__defineGetter__('downloadURL',
function Script_getDownloadUrl() { return this._downloadURL; });
Script.prototype.__defineSetter__('downloadURL',
function Script_setDownloadUrl(aVal) { this._downloadURL = '' + aVal; });

Script.prototype.__defineGetter__('uuid',
function Script_getUuid() { return this._uuid; });

Script.prototype.__defineGetter__('version',
function Script_getVersion() { return this._version; });

Script.prototype.__defineGetter__('icon',
function Script_getIcon() { return this._icon; });

Script.prototype.__defineGetter__('noframes',
function Script_getNoframes() { return this._noframes; });

Script.prototype.__defineGetter__('enabled',
function Script_getEnabled() { return this._enabled; });

Script.prototype.__defineSetter__('enabled',
function Script_setEnabled(enabled) {
  this._enabled = enabled;
  this._changed("edit-enabled", enabled);
});

Script.prototype.__defineGetter__('excludes',
function Script_getExcludes() { return this._excludes.concat(); });
Script.prototype.__defineSetter__('excludes',
function Script_setExcludes(excludes) { this._excludes = excludes.concat(); });

Script.prototype.__defineGetter__('grants',
function Script_getGrants() { return this._grants.concat(); });
Script.prototype.__defineSetter__('grants',
function Script_setGrants(grants) { this._grants = grants.concat(); });

Script.prototype.__defineGetter__('includes',
function Script_getIncludes() { return this._includes.concat(); });
Script.prototype.__defineSetter__('includes',
function Script_setIncludes(includes) { this._includes = includes.concat(); });

Script.prototype.__defineGetter__('userIncludes',
function Script_getUserIncludes() { return this._userIncludes.concat(); });
Script.prototype.__defineSetter__('userIncludes',
function Script_setUserIncludes(includes) { this._userIncludes = includes.concat(); });

Script.prototype.__defineGetter__('userExcludes',
function Script_getUserExcludes() { return this._userExcludes.concat(); });
Script.prototype.__defineSetter__('userExcludes',
function Script_setUserExcludes(excludes) { this._userExcludes = excludes.concat(); });

Script.prototype.__defineGetter__('matches',
function Script_getMatches() { return this._matches.concat(); });

Script.prototype.__defineGetter__('requires',
function Script_getRequires() { return this._requires.concat(); });

Script.prototype.__defineGetter__('resources',
function Script_getResources() { return this._resources.concat(); });

Script.prototype.__defineGetter__('runAt',
function Script_getRunAt() { return this._runAt; });

Script.prototype.__defineGetter__('filename',
function Script_getFilename() { return this._filename; });

Script.prototype.__defineGetter__('file',
function Script_getFile() {
  var file = this.baseDirFile;
  file.append(this._filename);
  return file;
});

Script.prototype.__defineGetter__('updateURL',
function Script_getUpdateURL() { return this._updateURL || this.downloadURL; });
Script.prototype.__defineSetter__('updateURL',
function Script_setUpdateURL(url) { this._updateURL = '' + url; });

Script.prototype.__defineGetter__('updateIsSecure',
function Script_getUpdateIsSecure() {
  if (!this.downloadURL) return null;
  return /^https/.test(this.downloadURL);
});

Script.prototype.__defineGetter__('baseDirName',
function Script_getBaseDirName() {
  return '' + this._basedir;
});

Script.prototype.__defineGetter__('baseDirFile',
function Script_getBaseDirFile() {
  var file = GM_util.scriptDir();
  file.append(this._basedir);
  try {
    // Can fail if this path does not exist.
    file.normalize();
  } catch (e) {
    // no-op
  }
  return file;
});

Script.prototype.__defineGetter__('fileURL',
function Script_getFileURL() { return GM_util.getUriFromFile(this.file).spec; });

Script.prototype.__defineGetter__('textContent',
function Script_getTextContent() { return GM_util.getContents(this.file); });

Script.prototype.setFilename = function(aBaseName, aFileName) {
  this._basedir = aBaseName;
  this._filename = aFileName;

  // If this script was created from the "new script" dialog, pretend it
  // has been installed from its final location, so that relative dependency
  // paths can be resolved correctly.
  if (!this.downloadURL) this.downloadURL = this.fileURL;
};

Script.prototype.fixTimestampsOnInstall = function() {
  this._modifiedTime = this.file.lastModifiedTime;
  this._installTime = this.file.lastModifiedTime;
};

Script.prototype._loadFromConfigNode = function(node) {
  this._filename = node.getAttribute("filename");
  this._basedir = node.getAttribute("basedir") || ".";
  this.downloadURL = node.getAttribute("installurl") || null;
  this.updateURL = node.getAttribute("updateurl") || null;

  if (!this.fileExists(this.baseDirFile)) return;
  if (!this.fileExists(this.file)) return;

  if (!node.hasAttribute("modified")
      || !node.hasAttribute("dependhash")
      || !node.hasAttribute("version")
  ) {
    var scope = {};
    Components.utils.import('resource://greasemonkey/parseScript.js', scope);
    var parsedScript = scope.parse(
        this.textContent, GM_util.uriFromUrl(this.downloadURL));

    this._modifiedTime = this.file.lastModifiedTime;
    this._dependhash = GM_util.sha1(parsedScript._rawMeta);
    this._version = parsedScript._version;

    this._changed('modified', null);
  } else {
    this._modifiedTime = parseInt(node.getAttribute("modified"), 10);
    this._dependhash = node.getAttribute("dependhash");
    this._version = node.getAttribute("version");
    if ('null' === this._version) this._version = null;
  }

  // Note that "checkRemoteUpdates" used to be a boolean.  As of #1647, it now
  // holds one of the AddonManager.AUTOUPDATE_* values; so it's name is
  // suboptimal.
  if (node.getAttribute('checkRemoteUpdates') === 'true') {
    // Legacy support, cast "true" to default.
    this.checkRemoteUpdates = AddonManager.AUTOUPDATE_DEFAULT;
  } else if (node.hasAttribute('checkRemoteUpdates')) {
    this.checkRemoteUpdates = parseInt(
        node.getAttribute('checkRemoteUpdates'), 10);
  }

  if (!node.hasAttribute("installTime")) {
    this._installTime = new Date().getTime();
    this._changed('modified', null);
  } else {
    this._installTime = parseInt(node.getAttribute("installTime"), 10);
  }

  this._uuid = node.getAttribute("uuid");

  for (var i = 0, childNode; childNode = node.childNodes[i]; i++) {
    switch (childNode.nodeName) {
    case "Exclude":
      this._excludes.push(childNode.textContent);
      break;
    case "Grant":
      this._grants.push(childNode.textContent);
      break;
    case "Include":
      this._includes.push(childNode.textContent);
      break;
    case "UserInclude":
      this._userIncludes.push(childNode.textContent);
      break;
    case "UserExclude":
      this._userExcludes.push(childNode.textContent);
      break;
    case "Match":
      this._matches.push(new MatchPattern(childNode.textContent));
      break;
    case "Require":
      var scriptRequire = new ScriptRequire(this);
      scriptRequire._filename = childNode.getAttribute("filename");
      this._requires.push(scriptRequire);
      break;
    case "Resource":
      var scriptResource = new ScriptResource(this);
      scriptResource._name = childNode.getAttribute("name");
      scriptResource._filename = childNode.getAttribute("filename");
      scriptResource._mimetype = childNode.getAttribute("mimetype");
      scriptResource._charset = childNode.getAttribute("charset");
      this._resources.push(scriptResource);
      break;
    case "Name":
    case "Description":
      var lang = childNode.getAttribute("lang");
      if (!this._locales[lang]) this._locales[lang] = {};
      this._locales[lang][childNode.nodeName.toLowerCase()] = childNode.textContent;
    }
  }

  this.checkConfig();
  this._name = node.getAttribute("name");
  this._namespace = node.getAttribute("namespace");
  this._description = node.getAttribute("description");
  this._enabled = node.getAttribute("enabled") == 'true';
  this._noframes = node.getAttribute("noframes") == 'true';
  this._runAt = node.getAttribute("runAt") || "document-end"; // legacy default
  this._updateMetaStatus = node.getAttribute("updateMetaStatus") || "unknown";
  this.icon.fileURL = node.getAttribute("icon");
};

Script.prototype.toConfigNode = function(doc) {
  var scriptNode = doc.createElement("Script");

  function addNode(name, content) {
    var node = doc.createElement(name);
    node.appendChild(doc.createTextNode(content));
    scriptNode.appendChild(doc.createTextNode("\n\t\t"));
    scriptNode.appendChild(node);

    return node;
  }

  function addArrayNodes(aName, aArray) {
    for (var i = 0, val = null; val = aArray[i]; i++) {
      addNode(aName, val);
    }
  }

  function addLocaleNode(aName, aLang, aContent) {
    var node = addNode(aName, aContent);
    node.setAttribute("lang", aLang);
  }

  addArrayNodes('Exclude', this._excludes);
  addArrayNodes('Grant', this._grants);
  addArrayNodes('Include', this._includes);
  addArrayNodes('UserExclude', this._userExcludes);
  addArrayNodes('UserInclude', this._userIncludes);

  for (var j = 0; j < this._matches.length; j++) {
    addNode('Match', this._matches[j].pattern);
  }

  for (var j = 0; j < this._requires.length; j++) {
    var req = this._requires[j];
    var resourceNode = doc.createElement("Require");

    resourceNode.setAttribute("filename", req._filename);

    scriptNode.appendChild(doc.createTextNode("\n\t\t"));
    scriptNode.appendChild(resourceNode);
  }

  for (var j = 0; j < this._resources.length; j++) {
    var imp = this._resources[j];
    var resourceNode = doc.createElement("Resource");

    resourceNode.setAttribute("name", imp._name);
    resourceNode.setAttribute("filename", imp._filename);
    resourceNode.setAttribute("mimetype", imp._mimetype);
    if (imp._charset) {
      resourceNode.setAttribute("charset", imp._charset);
    }

    scriptNode.appendChild(doc.createTextNode("\n\t\t"));
    scriptNode.appendChild(resourceNode);
  }


  for (var lang in this._locales) {
    if (this._locales[lang].name)
      addLocaleNode("Name", lang, this._locales[lang].name);

    if (this._locales[lang].description)
      addLocaleNode("Description", lang, this._locales[lang].description);
  }

  scriptNode.appendChild(doc.createTextNode("\n\t"));

  scriptNode.setAttribute("basedir", this._basedir);
  scriptNode.setAttribute("checkRemoteUpdates", this.checkRemoteUpdates);
  scriptNode.setAttribute("dependhash", this._dependhash);
  scriptNode.setAttribute("description", this._description);
  scriptNode.setAttribute("enabled", this._enabled);
  scriptNode.setAttribute("noframes", this._noframes);
  scriptNode.setAttribute("filename", this._filename);
  scriptNode.setAttribute("installTime", this._installTime);
  scriptNode.setAttribute("modified", this._modifiedTime);
  scriptNode.setAttribute("name", this._name);
  scriptNode.setAttribute("namespace", this._namespace);
  scriptNode.setAttribute("runAt", this._runAt);
  scriptNode.setAttribute("updateMetaStatus", this._updateMetaStatus);
  scriptNode.setAttribute("uuid", this._uuid);
  scriptNode.setAttribute("version", this._version);

  if (this.downloadURL) {
    scriptNode.setAttribute("installurl", this.downloadURL);
  }
  if (this.updateURL) {
    scriptNode.setAttribute("updateurl", this.updateURL);
  }
  if (this.icon.filename) {
    scriptNode.setAttribute("icon", this.icon.filename);
  }

  return scriptNode;
};

Script.prototype.toString = function() {
  return '[Greasemonkey Script ' + this.id + '; ' + this.version + ']';
};

Script.prototype.setDownloadedFile = function(file) { this._tempFile = file; };

Script.prototype.__defineGetter__('previewURL',
function Script_getPreviewURL() {
  return Components.classes["@mozilla.org/network/io-service;1"]
      .getService(Components.interfaces.nsIIOService)
      .newFileURI(this._tempFile).spec;
});

Script.prototype.info = function() {
  var matches = [];
  for (var i = 0, m = null; m = this.matches[i]; i++) {
    matches[matches.length] = m.pattern;
  }
  var resources = {};
  for (var i = 0, r = null; r = this.resources[i]; i++) {
    resources[r.name] = {
        'name': r.name,
        'mimetype': r.mimetype,
        };
  }
  return {
    'uuid': this.uuid,
    'version': gGreasemonkeyVersion,
    'scriptWillUpdate': this.isRemoteUpdateAllowed(),
    'script': {
      'description': this.description,
      'excludes': this.excludes,
      // 'icon': ???,
      'includes': this.includes,
      'localizedDescription': this.localized.description,
      'localizedName': this.localized.name,
      'matches': matches,
      'name': this.name,
      'namespace': this.namespace,
      // 'requires': ???,
      'resources': resources,
      'run-at': this.runAt,
      'version': this.version,
    },
    'scriptMetaStr': extractMeta(this.textContent),
    'scriptSource': this.textContent,
  };
};

Script.prototype.isModified = function() {
  if (!this.fileExists(this.file)) return false;
  if (this._modifiedTime != this.file.lastModifiedTime) {
    this._modifiedTime = this.file.lastModifiedTime;
    return true;
  }
  return false;
};

Script.prototype.isRemoteUpdateAllowed = function(aForced) {
  if (!this.updateURL) return false;
  if (!aForced) {
    if (!this.enabled) return false;
    if (this._modifiedTime > this._installTime) return false;
  }

  var ioService = Components.classes["@mozilla.org/network/io-service;1"]
      .getService(Components.interfaces.nsIIOService);
  try {
    var scheme = ioService.extractScheme(this.downloadURL);
  } catch (e) {
    // Invalid URL, probably an old legacy install.  Do not update.
    return false;
  }

  switch (scheme) {
  case 'about':
  case 'chrome':
  case 'file':
    // These schemes are explicitly never OK!
    return false;
  case 'ftp':
  case 'http':
    // These schemes are OK only if the user opts in.
    return !GM_prefRoot.getValue('requireSecureUpdates');;
  case 'https':
    // HTTPs is always OK.
    return true;
    break;
  default:
    // Anything not listed: default to not allow.
    return false;
  }
};

Script.prototype.updateFromNewScript = function(newScript, url, windowId, browser) {
  // Keep a _copy_ of the old script ID, so we can eventually pass it up
  // to the Add-ons manager UI, to update this script's old entry.
  var oldScriptId = '' + this.id;

  // If the @name and/or @namespace have changed, make sure they don't
  // conflict with another installed script.
  if (newScript.id != this.id) {
    if (!GM_util.getService().config.installIsUpdate(newScript)) {
      // Empty cached values.
      this._id = null;
      this._name = newScript._name;
      this._namespace = newScript._namespace;
    } else {
      // Notify the user of the conflict
      GM_util.alert(
          stringBundle.GetStringFromName('script.duplicate-installed')
              .replace('%1', newScript._name)
              .replace('%2', newScript._namespace)
          );
      return;
    }
  }

  // Copy new values.
  //  NOTE: User 'cludes are _not_ copied!  They should remain as-is.
  this._excludes = newScript._excludes;
  this._grants = newScript._grants;
  this._includes = newScript._includes;
  this._matches = newScript._matches;
  this._description = newScript._description;
  this._localized = newScript._localized;
  this._locales = newScript._locales;
  this._noframes = newScript._noframes;
  this._runAt = newScript._runAt;
  this._version = newScript._version;
  this.downloadURL = newScript.downloadURL;
  this.updateURL = newScript.updateURL;

  this.showGrantWarning();
  this.checkConfig();

  // Update add-ons manager UI.
  this._changed('modified', oldScriptId);

  var dependhash = GM_util.sha1(newScript._rawMeta);
  if (dependhash != this._dependhash && !newScript._dependFail) {
    // Store window references for late injection.
    if ('document-start' == this._runAt) {
      GM_util.logError(
          this.id + "\nNot running at document-start; waiting for update ...",
          true);
      this.pendingExec.push('document-start update');
    } else if (windowId) {
      this.pendingExec.push({
        'browser': browser,
        'url': url,
        'windowId': windowId
      });
    }

    // Re-download dependencies.
    var scope = {};
    Components.utils.import('resource://greasemonkey/remoteScript.js', scope);
    var rs = new scope.RemoteScript(this.downloadURL);
    newScript._basedir = this._basedir;
    rs.setScript(newScript);
    rs.download(GM_util.hitch(this, function(aSuccess) {
      if (!aSuccess) {
        GM_notification(
            'Could not update modified script\'s dependencies: '
            + rs.errorMessage,
        'dependency-update-failed');
        return;
      }

      // Get rid of old dependencies' files.
      for (var i = 0, dep = null; dep = this.dependencies[i]; i++) {
        try {
          if (dep.file.equals(this.baseDirFile)) {
            // Bugs like an empty file name can cause "dep.file" to point to
            // the containing directory.  Don't remove that!
            GM_util.logError(
                stringBundle.GetStringFromName('script.no-delete-directory'));
          } else {
            dep.file.remove(true);
          }
        } catch (e) {
          // Probably a locked file.  Ignore, warn.
            GM_util.logError(
                stringBundle.GetStringFromName('delete-failed')
                    .replace('%1', dep)
                );
        }
      }

      // Import dependencies from new script.
      this._dependhash = dependhash;
      this._icon = newScript._icon;
      this._requires = newScript._requires;
      this._resources = newScript._resources;
      // And fix those dependencies to still reference this script.
      this._icon._script = this;
      for (var i = 0, require = null; require = this._requires[i]; i++) {
        require._script = this;
      }
      for (var i = 0, resource = null; resource = this._resources[i]; i++) {
        resource._script = this;
      }

      // Install the downloaded files.
      rs.install(this, true);

      // Inject the script in all windows that have been waiting.
      var pendingExec;
      var pendingExecAry = this.pendingExec;
      this.pendingExec = [];
      while ((pendingExec = pendingExecAry.shift())) {
        if ('document-start update' == pendingExec) {
          GM_util.logError(
              this.id + '\n... script update complete '
              + '(will run at next document-start time).',
              true);
          continue;
        }

        var shouldRun = GM_util.scriptMatchesUrlAndRuns(
            this, pendingExec.url, this.runAt);

        if (shouldRun) {
          pendingExec.browser.messageManager.sendAsyncMessage(
              "greasemonkey:inject-script",
              {
                windowId: pendingExec.windowId,
                script: new IPCScript(this)
              });
        }
      }

      this._changed('modified');
    }));
  }
};

Script.prototype.showGrantWarning = function () {
  if (0 != this._grants.length || !GM_prefRoot.getValue('showGrantsWarning')) {
    return;
  }
  var getString = stringBundle.GetStringFromName;
  var chromeWin = GM_util.getBrowserWindow();

  function muteWarnings() {
    GM_prefRoot.setValue('showGrantsWarning', false);
  }

  var primaryAction = {
        'label': getString('warning.scripts-should-grant.read-docs'),
        'accessKey': getString('warning.scripts-should-grant.read-docs.key'),
        'callback': function() {
          chromeWin.gBrowser.selectedTab = chromeWin.gBrowser.addTab(
              'http://wiki.greasespot.net/@grant',
              {'ownerTab': chromeWin.gBrowser.selectedTab});
          muteWarnings();
        }
      };
  var secondaryActions = [{
        'label': getString('warning.scripts-should-grant.dont-show'),
        'accessKey': getString('warning.scripts-should-grant.dont-show.key'),
        'callback': muteWarnings
      }];

  chromeWin.PopupNotifications.show(
      chromeWin.gBrowser.selectedBrowser,
      'greasemonkey-grants',
      getString('warning.scripts-should-grant'),
      null,  // anchorID
      primaryAction, secondaryActions
      );
};

Script.prototype.checkConfig = function() {
  // TODO: Some day, make "none" the default.  Until then: sniff.
  if (0 == this._grants.length) {
    if (GM_prefRoot.getValue("sniffGrants")) {
      this.grants = GM_util.sniffGrants(this);
    } else {
      this.grants = ['none'];
    }
    this._changed('modified');
  }

  if (!this._uuid || !this._uuid.length) {
    this._uuid = GM_util.uuid();
    this._changed('modified');
  }
};

Script.prototype.checkForRemoteUpdate = function(aCallback, aForced) {
  if (this.availableUpdate) return aCallback(true);

  var uri = GM_util.uriFromUrl(this.updateURL).clone();

  // TODO: Consider restoring Coral cache usage.  We used to only apply it to
  // us.o; applying globally means it will be inserted for localhost/intranet/
  // etc. URLs which won't ever work.
//  GM_util.checkCoralCache();
//  if (GM_prefRoot.getValue("coralCacheWorks")) {
//    uri.host += '.nyud.net';
//  }

  var usedMeta = false;
  if (this._updateMetaStatus != 'fail') {
    uri.path = uri.path.replace('.user.js', '.meta.js');
    usedMeta = true;
  }
  var url = uri.spec;

  var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
      .createInstance(Components.interfaces.nsIXMLHttpRequest);
  req.overrideMimeType('application/javascript');
  req.open("GET", url, true);

  // Let the server know we want a user script metadata block
  req.setRequestHeader('Accept', 'text/x-userscript-meta');
  req.onload = GM_util.hitch(
      this, "checkRemoteVersion", req, aCallback, aForced, usedMeta);
  req.onerror = GM_util.hitch(null, aCallback, false);
  req.send(null);
};

Script.prototype.checkRemoteVersion = function(req, aCallback, aForced, aMeta) {
  var metaFail = GM_util.hitch(this, function() {
    this._updateMetaStatus = 'fail';
    this._changed('modified', null);
    return this.checkForRemoteUpdate(aCallback, aForced);
  });

  if (req.status != 200 && req.status != 0) {
    return ( aMeta ? metaFail() : aCallback(false) );
  }

  var source = req.responseText;
  var scope = {};
  Components.utils.import('resource://greasemonkey/parseScript.js', scope);
  var newScript = scope.parse(source, this.downloadURL);
  var remoteVersion = newScript.version;
  if (!remoteVersion) {
    return ( aMeta ? metaFail() : aCallback(false) );
  }

  if (aMeta && 'ok' != this._updateMetaStatus) {
    this._updateMetaStatus = 'ok';
    this._changed('modified', null);
  }

  var versionChecker = Components
      .classes["@mozilla.org/xpcom/version-comparator;1"]
      .getService(Components.interfaces.nsIVersionComparator);
  if (!aForced && versionChecker.compare(this._version, remoteVersion) >= 0) {
    return aCallback(false);
  }

  this.availableUpdate = newScript;
  this._changed('modified', null);
  aCallback(true);
};

Script.prototype.allFiles = function() {
  var files = [];
  if (!this.baseDirFile.equals(GM_util.scriptDir())) {
    files.push(this.baseDirFile);
  }
  files.push(this.file);
  for (var i = 0, r = null; r = this._requires[i]; i++) {
    files.push(r.file);
  }
  for (var i = 0, r = null; r = this._resources[i]; i++) {
    files.push(r.file);
  }
  return files;
};

Script.prototype.fileExists = function(file) {
  try {
    return file.exists();
  } catch (e) {
    return false;
  }
};

Script.prototype.allFilesExist = function() {
  return this.allFiles().every(this.fileExists);
};

Script.prototype.uninstall = function(forUpdate) {
  if ('undefined' == typeof(forUpdate)) forUpdate = false;

  if (this.baseDirFile.equals(GM_util.scriptDir())) {
    // If script is in the root, just remove the file.
    try {
      if (this.file.exists()) this.file.remove(false);
    } catch (e) {
      dump('Remove failed: ' + this.file.path + '\n');
    }
  } else if (this.baseDirFile.exists()) {
    // If script has its own dir, remove the dir + contents.
    try {
      this.baseDirFile.remove(true);
    } catch (e) {
      dump('Remove failed: ' + this.baseDirFile.path + '\n');
    }
  }

  if (!forUpdate) {
    var storage = new GM_ScriptStorage(this);
    var file = storage.dbFile;
    GM_util.enqueueRemoveFile(file);
    file.leafName += '-journal';
    GM_util.enqueueRemoveFile(file);
  }

  this._changed('uninstall', forUpdate);
};
