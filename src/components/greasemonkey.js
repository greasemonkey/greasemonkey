const CLASSNAME = "GM_GreasemonkeyService";
const CONTRACTID = "@greasemonkey.mozdev.org/greasemonkey-service;1";
const CID = Components.ID("{77bf3650-1cd6-11da-8cd6-0800200c9a66}");

const Cc = Components.classes;
const Ci = Components.interfaces;

const appSvc = Cc["@mozilla.org/appshell/appShellService;1"]
                 .getService(Ci.nsIAppShellService);

function alert(msg) {
  Cc["@mozilla.org/embedcomp/prompt-service;1"]
    .getService(Ci.nsIPromptService)
    .alert(null, "Greasemonkey alert", msg);
};

var greasemonkeyService = {

  browserWindows: [],


  // nsISupports
  QueryInterface: function(aIID) {
    if (!aIID.equals(Ci.nsIObserver) &&
        !aIID.equals(Ci.nsISupports) &&
        !aIID.equals(Ci.nsISupportsWeakReference) &&
        !aIID.equals(Ci.gmIGreasemonkeyService) &&
        !aIID.equals(Ci.nsIWindowMediatorListener) &&
        !aIID.equals(Ci.nsIContentPolicy)) {
      throw Components.results.NS_ERROR_NO_INTERFACE;
    }

    return this;
  },


  // nsIObserver
  observe: function(aSubject, aTopic, aData) {
    if (aTopic == "app-startup") {
      this.startup();
    }
  },


  // gmIGreasemonkeyService
  registerBrowser: function(browserWin) {
    var existing;

    for (var i = 0; existing = this.browserWindows[i]; i++) {
      if (existing == browserWin) {
        // NOTE: Unlocalised strings
        throw new Error("Browser window has already been registered.");
      }
    }

    this.browserWindows.push(browserWin);
  },

  unregisterBrowser: function(browserWin) {
   var existing;

    for (var i = 0; existing = this.browserWindows[i]; i++) {
      if (existing == browserWin) {
        this.browserWindows.splice(i, 1);
        return;
      }
    }

    throw new Error("Browser window is not registered.");
  },

  domContentLoaded: function(wrappedContentWin, chromeWin) {
    var unsafeWin = wrappedContentWin.wrappedJSObject;
    var unsafeLoc = new XPCNativeWrapper(unsafeWin, "location").location;
    var href = new XPCNativeWrapper(unsafeLoc, "href").href;
    var scripts = this.initScripts(href);

    if (scripts.length > 0) {
      this.injectScripts(scripts, href, unsafeWin, chromeWin);
    }
  },


  startup: function() {
    Cc["@mozilla.org/moz/jssubscript-loader;1"]
      .getService(Ci.mozIJSSubScriptLoader)
      .loadSubScript("chrome://global/content/XPCNativeWrapper.js");

    Cc["@mozilla.org/moz/jssubscript-loader;1"]
      .getService(Ci.mozIJSSubScriptLoader)
      .loadSubScript("chrome://greasemonkey/content/prefmanager.js");

    Cc["@mozilla.org/moz/jssubscript-loader;1"]
      .getService(Ci.mozIJSSubScriptLoader)
      .loadSubScript("chrome://greasemonkey/content/versioning.js");

    Cc["@mozilla.org/moz/jssubscript-loader;1"]
      .getService(Ci.mozIJSSubScriptLoader)
      .loadSubScript("chrome://greasemonkey/content/utils.js");

    Cc["@mozilla.org/moz/jssubscript-loader;1"]
      .getService(Ci.mozIJSSubScriptLoader)
      .loadSubScript("chrome://greasemonkey/content/config.js");

    Cc["@mozilla.org/moz/jssubscript-loader;1"]
      .getService(Ci.mozIJSSubScriptLoader)
      .loadSubScript("chrome://greasemonkey/content/convert2RegExp.js");

    Cc["@mozilla.org/moz/jssubscript-loader;1"]
      .getService(Ci.mozIJSSubScriptLoader)
      .loadSubScript("chrome://greasemonkey/content/miscapis.js");

    Cc["@mozilla.org/moz/jssubscript-loader;1"]
      .getService(Ci.mozIJSSubScriptLoader)
      .loadSubScript("chrome://greasemonkey/content/xmlhttprequester.js");

    //loggify(this, "GM_GreasemonkeyService");
  },

  shouldLoad: function(ct, cl, org, ctx, mt, ext) {
    var ret = Ci.nsIContentPolicy.ACCEPT;

    // don't intercept anything when GM is not enabled
    if (!GM_getEnabled()) {
      return ret;
    }

    // block content detection of greasemonkey by denying GM
    // chrome content, unless loaded from chrome
    if (org && org.scheme != "chrome" && cl.scheme == "chrome" &&
        decodeURI(cl.host) == "greasemonkey") {
      return Ci.nsIContentPolicy.REJECT_SERVER;
    }

    // don't interrupt the view-source: scheme
    // (triggered if the link in the error console is clicked)
    if ("view-source" == cl.scheme) {
      return ret;
    }

    if (ct == Ci.nsIContentPolicy.TYPE_DOCUMENT &&
        cl.spec.match(/\.user\.js$/)) {

      dump("shouldload: " + cl.spec + "\n");
      dump("ignorescript: " + this.ignoreNextScript_ + "\n");

      if (!this.ignoreNextScript_) {
        if (!this.isTempScript(cl)) {
          var winWat = Cc["@mozilla.org/embedcomp/window-watcher;1"]
            .getService(Ci.nsIWindowWatcher);

          if (winWat.activeWindow && winWat.activeWindow.GM_BrowserUI) {
            winWat.activeWindow.GM_BrowserUI.startInstallScript(cl);
            ret = Ci.nsIContentPolicy.REJECT_REQUEST;
          }
        }
      }
    }

    this.ignoreNextScript_ = false;
    return ret;
  },

  shouldProcess: function(ct, cl, org, ctx, mt, ext) {
    return Ci.nsIContentPolicy.ACCEPT;
  },

  ignoreNextScript: function() {
    dump("ignoring next script...\n");
    this.ignoreNextScript_ = true;
  },

  isTempScript: function(uri) {
    if (uri.scheme != "file") {
      return false;
    }

    var fph = Components.classes["@mozilla.org/network/protocol;1?name=file"]
    .getService(Ci.nsIFileProtocolHandler);

    var file = fph.getFileFromURLSpec(uri.spec);
    var tmpDir = Components.classes["@mozilla.org/file/directory_service;1"]
    .getService(Components.interfaces.nsIProperties)
    .get("TmpD", Components.interfaces.nsILocalFile);

    return file.parent.equals(tmpDir) && file.leafName != "newscript.user.js";
  },

  initScripts: function(url) {
    var config = new Config();
    var scripts = [];
    config.load();

    outer:
    for (var i = 0; i < config.scripts.length; i++) {
      var script = config.scripts[i];
      if (script.enabled) {
        for (var j = 0; j < script.includes.length; j++) {
          var pattern = convert2RegExp(script.includes[j]);

          if (pattern.test(url)) {
            for (var k = 0; k < script.excludes.length; k++) {
              pattern = convert2RegExp(script.excludes[k]);

              if (pattern.test(url)) {
                continue outer;
              }
            }

            scripts.push(script);

            continue outer;
          }
        }
      }
    }

    log("* number of matching scripts: " + scripts.length);
    return scripts;
  },

  injectScripts: function(scripts, url, unsafeContentWin, chromeWin) {
    var sandbox;
    var script;
    var logger;
    var console;
    var storage;
    var xmlhttpRequester;
    var resources;
    var safeWin = new XPCNativeWrapper(unsafeContentWin);
    var safeDoc = safeWin.document;

    // detect and grab reference to firebug console and context, if it exists
    var firebugConsole = this.getFirebugConsole(unsafeContentWin, chromeWin);

    for (var i = 0; script = scripts[i]; i++) {
      sandbox = new Components.utils.Sandbox(safeWin);

      logger = new GM_ScriptLogger(script);

      console = firebugConsole ? firebugConsole : new GM_console(script);

      storage = new GM_ScriptStorage(script);
      xmlhttpRequester = new GM_xmlhttpRequester(unsafeContentWin,
                                                 appSvc.hiddenDOMWindow);
      resources = new GM_Resources(script);

      sandbox.window = safeWin;
      sandbox.document = sandbox.window.document;
      sandbox.unsafeWindow = unsafeContentWin;

      // hack XPathResult since that is so commonly used
      sandbox.XPathResult = Ci.nsIDOMXPathResult;

      // add our own APIs
      sandbox.GM_addStyle = function(css) { GM_addStyle(safeDoc, css) };
      sandbox.GM_log = GM_hitch(logger, "log");
      sandbox.console = console;
      sandbox.GM_setValue = GM_hitch(storage, "setValue");
      sandbox.GM_getValue = GM_hitch(storage, "getValue");
      sandbox.GM_getResourceURL = GM_hitch(resources, "getResourceURL");
      sandbox.GM_getResourceText = GM_hitch(resources, "getResourceText");
      sandbox.GM_openInTab = GM_hitch(this, "openInTab", unsafeContentWin);
      sandbox.GM_xmlhttpRequest = GM_hitch(xmlhttpRequester,
                                           "contentStartRequest");
      sandbox.GM_registerMenuCommand = GM_hitch(this,
                                                "registerMenuCommand",
                                                unsafeContentWin);

      sandbox.__proto__ = safeWin;

      var contents = getContents(getScriptFileURI(script))

      var requires = [];
      var offsets = [];
      var offset = 0;

      script.requires.forEach(function(req){
        var uri = getDependencyFileURI(script, req);
        var contents = getContents(uri);
        var lineCount = contents.split("\n").length;
        requires.push(getContents(uri));
        offset += lineCount;
        offsets.push(offset);
      })
      script.offsets = offsets;

      var scriptSrc = "(function(){\n" +
                         requires.join("\n") +
                         "\n" +
                         contents +
                         "\n})()";
      this.evalInSandbox(scriptSrc,
                         url,
                         sandbox,
                         script);
    }
  },

  registerMenuCommand: function(unsafeContentWin, commandName, commandFunc,
                                accelKey, accelModifiers, accessKey) {
    var command = {name: commandName,
                   accelKey: accelKey,
                   accelModifiers: accelModifiers,
                   accessKey: accessKey,
                   doCommand: commandFunc,
                   window: unsafeContentWin };

    for (var i = 0; i < this.browserWindows.length; i++) {
      this.browserWindows[i].registerMenuCommand(command);
    }
  },

  openInTab: function(unsafeContentWin, url) {
    GM_apiLeakCheck();

    var unsafeTop = new XPCNativeWrapper(unsafeContentWin, "top").top;

    for (var i = 0; i < this.browserWindows.length; i++) {
      this.browserWindows[i].openInTab(unsafeTop, url);
    }
  },

  evalInSandbox: function(code, codebase, sandbox, script) {
    if (!(Components.utils && Components.utils.Sandbox)) {
      var e = new Error("Could not create sandbox.");
      GM_logError(e, 0, e.fileName, e.lineNumber);
    } else {
      try {
        // workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=307984
        var lineFinder = new Error();
        Components.utils.evalInSandbox(code, sandbox);
      } catch (e) {
        // try to find the line of the actual error line
        var line = e.lineNumber;
        if (4294967295 == line) {
          // Line number is reported as max int in edge cases.  Sometimes
          // the right one is in the "location", instead.  Look there.
          if (e.location && e.location.lineNumber) {
            line = e.location.lineNumber;
          } else {
            // Reporting max int is useless, if we couldn't find it in location
            // either, forget it.  Value of 0 isn't shown in the console.
            line = 0;
          }
        }

        if (line) {
          var err = this.findError(script, line - lineFinder.lineNumber - 1);
          GM_logError(
            e, // error obj
            0, // 0 = error (1 = warning)
            err.uri,
            err.lineNumber
          );
        } else {
          GM_logError(
            e, // error obj
            0, // 0 = error (1 = warning)
            getScriptFileURI(script).spec,
            0
          );
        }
      }
    }
  },

  findError: function(script, lineNumber){
    var start = 0;
    var end = 1;

    for (var i = 0; i < script.offsets.length; i++) {
      end = script.offsets[i];
      if (lineNumber < end) {
        return {
          uri: getDependencyFileURI(script, script.requires[i]).spec,
          lineNumber: (lineNumber - start)
        };
      }
      start = end;
    }

    return {
      uri: getScriptFileURI(script).spec,
      lineNumber: (lineNumber - end)
    };
  },

  getFirebugConsole: function(unsafeContentWin, chromeWin) {
    var firebugConsoleCtor = null;
    var firebugContext = null;

    if (chromeWin && chromeWin.FirebugConsole) {
      firebugConsoleCtor = chromeWin.FirebugConsole;
      firebugContext = chromeWin.top.TabWatcher
        .getContextByWindow(unsafeContentWin);

      // on first load (of multiple tabs) the context might not exist
      if (!firebugContext) firebugConsoleCtor = null;
    }

    if (firebugConsoleCtor && firebugContext) {
      return new firebugConsoleCtor(firebugContext, unsafeContentWin);
    } else {
      return null;
    }
  }
};

greasemonkeyService.wrappedJSObject = greasemonkeyService;

//loggify(greasemonkeyService, "greasemonkeyService");



/**
 * XPCOM Registration goop
 */
var Module = new Object();

Module.registerSelf = function(compMgr, fileSpec, location, type) {
  compMgr = compMgr.QueryInterface(Ci.nsIComponentRegistrar);
  compMgr.registerFactoryLocation(CID,
                                  CLASSNAME,
                                  CONTRACTID,
                                  fileSpec,
                                  location,
                                  type);

  var catMgr = Cc["@mozilla.org/categorymanager;1"]
                 .getService(Ci.nsICategoryManager);

  catMgr.addCategoryEntry("app-startup",
                          CLASSNAME,
                          CONTRACTID,
                          true,
                          true);

  catMgr.addCategoryEntry("content-policy",
                          CONTRACTID,
                          CONTRACTID,
                          true,
                          true);
};

Module.getClassObject = function(compMgr, cid, iid) {
  if (!cid.equals(CID)) {
    throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
  }

  if (!iid.equals(Ci.nsIFactory)) {
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }

  return Factory;
};

Module.canUnload = function(compMgr) {
  return true;
};


var Factory = new Object();

Factory.createInstance = function(outer, iid) {
  if (outer != null) {
    throw Components.results.NS_ERROR_NO_AGGREGATION;
  }

  return greasemonkeyService;
};


function NSGetModule(compMgr, fileSpec) {
  return Module;
};

//loggify(Module, "greasemonkeyService:Module");
//loggify(Factory, "greasemonkeyService:Factory");