/**
 * Greasemonkey autoupdater.
 *
 * This will run in the background silently, if an update is installed,
 * users will see the standard '[extensionname] has been updated,
 * restart to ...' in the extension manager.
 *
 * ExtensionUpdater will look for the em:updateURL of the selected
 * extension in the extension manager RDF, if found it will compare
 * the version number of the installed extension against the version
 * number listed in the RDF at the linked updateURL. If the local
 * version is older, ExtensionUpdater will download and install the
 * update. This process is entirely silent, and the only way a user
 * can tell that their extension has been updated would be to look for
 * '[extensionname] will be upgraded when firefox is restarted' in
 * their extension manager. (On that note, no matter where in the
 * startup sequence you call this object, Firefox will still require
 * a restart after the extension is updated).
 */
var AUTOUPDATE_DEFAULT_VALUE = true;

/**
 * @param {String} id ID of extension (as used in install.rdf)
 * @constructor
 */
function ExtensionUpdater(id) {
  if (!id) {
    throw new Error("You need to specify an extension id");
  }

  this.RDFSvc_  = Cc["@mozilla.org/rdf/rdf-service;1"]
                    .getService(Ci.nsIRDFService);

  this.id = id;
  this.updating = false;
}

/**
 * Begins the update process.
 *
 * Designed so that Update can be called multiple times (e.g at set
 * intervals). Also silently returns if an update is in progress.
 */
ExtensionUpdater.prototype.update = function() {
  if (this.updating) {
    return false;
  }

  this.updating = true;

  this.appVersion = "";
  this.appID = "";

  this.currentVersion = "";
  this.updateURL = "";

  this.updateLink = "";
  this.updateVersion = "";

  if (!this.getCurrent()) {
    GM_log("ExtensionUpdater: Could not find " + this.id + " in " +
           "extension manager");
    return false;
  }

  this.attemptUpdate();
}

/**
 * For now, just update every 24 hours. We check a preference to see
 * when we last updated, and then hook a timer to update 24 hours from now.
 * Note that it is still possible, if unlikely, to have concurrent update
 * requests unless the updater is created in a global context.
 *
 * @param {Boolean} if false, do not create the timer
 */
ExtensionUpdater.prototype.updatePeriodically = function() {
  var lastUpdate = GM_prefRoot.getValue("lastUpdate", 0);
  var timeBetweenUpdates = 24 * 60 * 60 * 1000;
  // Hopefully people don't screw with the value
  var nextUpdate = Number(lastUpdate) + timeBetweenUpdates;
  var now = new Date().getTime();
  GM_log("ExtensionUpdater: Last update: " + lastUpdate + ", " +
         "next: " + nextUpdate);
  if (now > nextUpdate) {
    GM_prefRoot.setValue("lastUpdate", String(now));
    this.update();
    nextUpdate = now + timeBetweenUpdates;
  }

  GM_log("ExtensionUpdater: Setting timer for update in " +
         (nextUpdate - now) + "ms");
  this.timer_ = Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer);
  this.timer_.init(this, nextUpdate - now, this.timer_.TYPE_ONE_SHOT);
}

ExtensionUpdater.prototype.observe = function(subject, topic, data) {
  if (topic != "timer-callback") {
    GM_log("ExtensionUpdater: unexpected observer topic: " + topic);
    return;
  }

  this.update();
};

/**
 * Goes through local extension manager RDF and finds the relevant details
 * for the selected extension.
 */
ExtensionUpdater.prototype.getCurrent = function() {
  var updItem = Cc["@mozilla.org/extensions/manager;1"]
                .getService(Ci.nsIExtensionManager)
                .getItemForID(this.id);

  if(!updItem) {
    return false;
  }

  var appInfo = Cc["@mozilla.org/xre/app-info;1"]
                .getService(Ci.nsIXULAppInfo);

  this.name = updItem.name;
  this.currentVersion = updItem.version;
  GM_log("ExtensionUpdater: Got current item. name: " + updItem.name + ", " +
         "version: " + updItem.version + ", " + "rdf: " + updItem.updateRDF);

  var prefs = Cc["@mozilla.org/preferences-service;1"]
                .getService(Ci.nsIPrefService)
                .getBranch("extensions.update.");
  if (prefs.getPrefType("url") == prefs.PREF_INVALID) {
    GM_log("ExtensionUpdater: Could not find updateURL in preferences");
    return false;
  }

  var xulRuntime = Cc["@mozilla.org/xre/app-info;1"]
                     .createInstance(Ci.nsIXULRuntime);

  this.updateURL = prefs.getComplexValue("url", Ci.nsIPrefLocalizedString).data;
  this.updateURL = this.updateURL.replace(/%APP_ABI%/g, xulRuntime.XPCOMABI)
                                 .replace(/%APP_ID%/g, appInfo.ID)
                                 .replace(/%APP_OS%/g, xulRuntime.OS)
                                 .replace(/%APP_VERSION%/g, appInfo.version)
                                 .replace(/%ITEM_ID%/g, this.id)
                                 .replace(/%ITEM_MAXAPPVERSION%/g,
                                          updItem.maxAppVersion)
                                 .replace(/%ITEM_STATUS%/g, "userEnabled")
                                 .replace(/%ITEM_VERSION%/g,
                                          this.currentVersion)
                                 .replace(/%REQ_VERSION%/gi, "1");
  GM_log("ExtensionUpdater: UpdateURL: " + this.updateURL);
  return true;
};

/**
 * Connects to updateURL, retrieves and parses RDF, compares versions
 * and calls installUpdate if required.
 */
ExtensionUpdater.prototype.attemptUpdate = function() {
  GM_log("ExtensionUpdater: attemptUpdate");
  if (!this.updateURL) {
    return false;
  }

  this.req_ = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
                .createInstance();
  this.req_.onload = GM_hitch(this, "OnReqSuccess");
  this.req_.onerror = GM_hitch(this, "OnReqFailure");
  this.req_.open("GET", this.updateURL);
  this.req_.send(null);
}

ExtensionUpdater.prototype.OnReqFailure = function() {
  this.failure("OnReqFailure");
}

ExtensionUpdater.prototype.OnReqSuccess = function() {
  GM_log("ExtensionUpdater: OnReqSuccess");

  // parseString (below) doesn't throw errors - rather they come from
  // the RDF file itself, so we can't try/catch for invalid XML.
  if (this.req_.status != 200) {
    this.failure("ExtensionUpdater: Update URL request failed with status: " +
                 this.req_.status);
    return;
  }

  if (!this.req_.responseText.match(/<rdf/gi)) {
    this.failure("Error: Invalid Update RDF contents: " +
                 this.req_.responseText);
    return;
  }

  var uri = Cc["@mozilla.org/network/io-service;1"]
            .getService(Ci.nsIIOService)
            .newURI(this.updateURL, null, null);
  var parser = Cc["@mozilla.org/rdf/xml-parser;1"]
               .createInstance(Ci.nsIRDFXMLParser);
  var memoryDS = Cc["@mozilla.org/rdf/datasource;1?name=in-memory-datasource"]
                 .createInstance(Ci.nsIRDFDataSource);

  parser.parseString(memoryDS, uri, this.req_.responseText);

  GM_log("ExtensionUpdater: RDF loaded");

  var moz = "http://www.mozilla.org/2004/em-rdf#";

  var versionArc = this.RDFSvc_.GetResource(moz + "version");
  var updateLinkArc = this.RDFSvc_.GetResource(moz + "updateLink");

  var thisResource = null;
  var dsResources = memoryDS.GetAllResources();

  // Cycle through RDF looking for what we want what we want
  GM_log("ExtensionUpdater: Cycling through RDF");
  // TODO(glen): Make sure this matches the correct GUID for Firefox
  //   also, check that update.rdf can't have some other funky format
  while (dsResources.hasMoreElements()) {
    thisResource = dsResources.getNext().QueryInterface(Ci.nsIRDFResource);

    var versionRes = memoryDS.GetTarget(thisResource, versionArc, true);

    if (versionRes) {
      this.updateVersion = versionRes.QueryInterface(Ci.nsIRDFLiteral).Value;
    }

    var updateLinkRes = memoryDS.GetTarget(thisResource, updateLinkArc, true);

    if (updateLinkRes) {
      this.updateLink = updateLinkRes.QueryInterface(Ci.nsIRDFLiteral).Value;
    }
  }

  if (this.updateVersion && this.updateLink) {
    GM_log("ExtensionUpdater: currentVersion: " + this.currentVersion + ", " +
           "updateVersion: " + this.updateVersion + ", " +
           "updateLink: " + this.updateLink);

    if (GM_compareVersions(this.updateVersion, this.currentVersion) == 1) {
      GM_log("ExtensionUpdater: Local version is old, now installing " +
             "update...");
      this.installUpdate();
    } else {
      this.success("No need to update");
    }
  } else {
    this.failure("No update info in rdf");
  }
}

/**
 * Starts XPI retrieval and installation.
 */
ExtensionUpdater.prototype.installUpdate = function() {
  if (!this.updateLink) {
    this.failure("Failure");
    return false;
  }

  var manager = Cc["@mozilla.org/xpinstall/install-manager;1"]
                 .createInstance(Ci.nsIXPInstallManager);

  if (manager != null) {
    GM_log("ExtensionUpdater: installUpdate. link: " + this.updateLink);

    var items = [this.updateLink];

    // Figure out if extension should be updated (default to "yes")
    var autoupdate = GM_prefRoot.getValue("enableUpdate",
                                          AUTOUPDATE_DEFAULT_VALUE);
    if (autoupdate == false) {
      this.success("Would have updated, except update is disabled");
    } else {
      GM_log("ExtensionUpdater: Extension '" + this.name + "' updating...");
      manager.initManagerFromChrome(items, items.length, this);
    }
  } else {
    this.failure("Error creating manager");
  }
}

/**
 * Part of observer for initManagerFromChrome
 */
ExtensionUpdater.prototype.onStateChange = function(index, state, value) {
  if(state == Ci.nsIXPIProgressDialog.INSTALL_DONE) {
    GM_log("ExtensionUpdater: onStateChange. Value: " + value);
    if(value != 0) {
      this.failure("Download Error");
    } else {
      this.success("Update installed");
    }
  }
}

/**
 * Part of observer for initManagerFromChrome
 */
ExtensionUpdater.prototype.onProgress = function(index, value, maxValue) {}

/**
 * Success function
 *
 * @param {String} message
 */
ExtensionUpdater.prototype.success = function(aMessage) {
  GM_log("ExtensionUpdater: success - " + aMessage);
  this.updating = false;
}
/**
 * Failure function
 *
 * @param {String} Error message
 */
ExtensionUpdater.prototype.failure = function(aMessage) {
  GM_log("ExtensionUpdater: failed - " + aMessage);
  this.updating = false;
}
