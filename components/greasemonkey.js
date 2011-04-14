// XPCOM info
const DESCRIPTION = "GM_GreasemonkeyService";
const CONTRACTID = "@greasemonkey.mozdev.org/greasemonkey-service;1";
const CLASSID = Components.ID("{77bf3650-1cd6-11da-8cd6-0800200c9a66}");

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

// XPCOMUtils.defineLazyServiceGetter() introduced in FF 3.6
if (XPCOMUtils.defineLazyServiceGetter) {
  XPCOMUtils.defineLazyServiceGetter(
      this, "appSvc", "@mozilla.org/appshell/appShellService;1",
      "nsIAppShellService");
} else {
  appSvc = Cc["@mozilla.org/appshell/appShellService;1"]
      .getService(Ci.nsIAppShellService);
}

const gmSvcFilename = Components.stack.filename;

const maxJSVersion = (function getMaxJSVersion() {
  var appInfo = Cc["@mozilla.org/xre/app-info;1"]
      .getService(Ci.nsIXULAppInfo);
  var versionChecker = Cc["@mozilla.org/xpcom/version-comparator;1"]
      .getService(Ci.nsIVersionComparator);

  // Firefox 3.5 and higher supports 1.8.
  if (versionChecker.compare(appInfo.version, "3.5") >= 0) {
    return "1.8";
  }

  // Everything else supports 1.6.
  return "1.6";
})();

var gStartupHasRun = false;
var gMenuCommands = [];

function alert(msg) {
  Cc["@mozilla.org/embedcomp/prompt-service;1"]
    .getService(Ci.nsIPromptService)
    .alert(null, "Greasemonkey alert", msg);
}

// Examines the stack to determine if an API should be callable.
function GM_apiLeakCheck(apiName) {
  var stack = Components.stack;

  do {
    // Valid stack frames for GM api calls are: native and js when coming from
    // chrome:// URLs and the greasemonkey.js component's file:// URL.
    if (2 == stack.language) {
      // NOTE: In FF 2.0.0.0, I saw that stack.filename can be null for JS/XPCOM
      // services. This didn't happen in FF 2.0.0.11; I'm not sure when it
      // changed.
      if (stack.filename != null &&
          stack.filename != gmSvcFilename &&
          stack.filename.substr(0, 6) != "chrome") {
        GM_logError(new Error("Greasemonkey access violation: unsafeWindow " +
                    "cannot call " + apiName + "."));
        return false;
      }
    }

    stack = stack.caller;
  } while (stack);

  return true;
}


function GM_GreasemonkeyService() {
  this.wrappedJSObject = this;
}

GM_GreasemonkeyService.prototype = {
  classDescription:  DESCRIPTION,
  classID:           CLASSID,
  contractID:        CONTRACTID,
  _xpcom_categories: [{category: "app-startup",
                       entry: DESCRIPTION,
                       value: CONTRACTID,
                       service: true},
                      {category: "content-policy",
                       entry: CONTRACTID,
                       value: CONTRACTID,
                       service: true}],

  // nsISupports
  QueryInterface: XPCOMUtils.generateQI([
      Ci.nsIObserver,
      Ci.nsISupports,
      Ci.nsISupportsWeakReference,
      Ci.gmIGreasemonkeyService,
      Ci.nsIWindowMediatorListener,
      Ci.nsIContentPolicy
  ]),

  _config: null,
  get config() {
    if (!this._config) {
      // First guarantee instantiation and existence.  (So that anything,
      // including stuff inside i.e. config._load(), can call
      // i.e. config._changed().)
      this._config = new Config();
      // Then initialize.
      this._config.initialize();
    }
    return this._config;
  },

  // nsIObserver
  observe: function(aSubject, aTopic, aData) {
    switch (aTopic) {
      case 'app-startup':
      case 'profile-after-change':
        this.startup();
        break;
    }
  },

  domContentLoaded: function(wrappedContentWin, chromeWin) {
    var url = wrappedContentWin.document.location.href;
    var scripts = this.initScripts(url, wrappedContentWin, chromeWin);

    if (scripts.length > 0) {
      this.injectScripts(scripts, url, wrappedContentWin, chromeWin);
    }
  },

  withAllMenuCommandsForWindowId: function(contentWindowId, callback) {
    var l = gMenuCommands.length - 1;
    for (var i = l, command = null; command = gMenuCommands[i]; i--) {
      if (!contentWindowId
          || (command.contentWindowId == contentWindowId)
      ) {
        callback(i, command);
      }
    }
  },

  contentDestroyed: function(contentWindowId) {
    if (!contentWindowId) return;
    this.withAllMenuCommandsForWindowId(null, function(index, command) {
      var closed = false;
      try { closed = command.contentWindow.closed; } catch (e) { }

      if (closed || (command.contentWindowId == contentWindowId)) {
        gMenuCommands.splice(index, 1);
      }
    });
  },

  contentFrozen: function(contentWindowId) {
    if (!contentWindowId) return;
    this.withAllMenuCommandsForWindowId(contentWindowId,
        function(index, command) { command.frozen = true; });
  },

  contentThawed: function(contentWindowId) {
    if (!contentWindowId) return;
    this.withAllMenuCommandsForWindowId(contentWindowId,
        function(index, command) { command.frozen = false; });
  },

  startup: function() {
    if (gStartupHasRun) return;
    gStartupHasRun = true;

    var loader = Cc["@mozilla.org/moz/jssubscript-loader;1"]
      .getService(Ci.mozIJSSubScriptLoader);
    loader.loadSubScript("chrome://global/content/XPCNativeWrapper.js");
    loader.loadSubScript("chrome://greasemonkey/content/prefmanager.js");
    loader.loadSubScript("chrome://greasemonkey/content/utils.js");
    loader.loadSubScript("chrome://greasemonkey/content/config.js");
    loader.loadSubScript("chrome://greasemonkey/content/script.js");
    loader.loadSubScript("chrome://greasemonkey/content/scriptrequire.js");
    loader.loadSubScript("chrome://greasemonkey/content/scriptresource.js");
    loader.loadSubScript("chrome://greasemonkey/content/scripticon.js");
    loader.loadSubScript("chrome://greasemonkey/content/convert2RegExp.js");
    loader.loadSubScript("chrome://greasemonkey/content/miscapis.js");
    loader.loadSubScript("chrome://greasemonkey/content/xmlhttprequester.js");
    loader.loadSubScript("chrome://greasemonkey/content/scriptdownloader.js");
  },

  shouldLoad: function(ct, cl, org, ctx, mt, ext) {
    var ret = Ci.nsIContentPolicy.ACCEPT;

    // don't intercept anything when GM is not enabled
    if (!GM_getEnabled()) {
      return ret;
    }

    // don't interrupt the view-source: scheme
    // (triggered if the link in the error console is clicked)
    if ("view-source" == cl.scheme) {
      return ret;
    }

    if ((ct == Ci.nsIContentPolicy.TYPE_DOCUMENT
         || ct == Ci.nsIContentPolicy.TYPE_SUBDOCUMENT)
        && cl.spec.match(/\.user\.js$/)
    ) {
      if (!this.ignoreNextScript_
        && !this.isTempScript(cl)
        && GM_installUri(cl, ctx.contentWindow)
      ) {
        ret = Ci.nsIContentPolicy.REJECT_REQUEST;
      }
    }

    this.ignoreNextScript_ = false;
    return ret;
  },

  shouldProcess: function(ct, cl, org, ctx, mt, ext) {
    return Ci.nsIContentPolicy.ACCEPT;
  },

  ignoreNextScript: function() {
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

  initScripts: function(url, wrappedContentWin, chromeWin) {
    if (GM_prefRoot.getValue('enableScriptRefreshing')) {
      this.config.updateModifiedScripts(wrappedContentWin, chromeWin);
    }

    return this.config.getMatchingScripts(function(script) {
          return GM_scriptMatchesUrlAndRuns(script, url)
        });
  },

  injectScripts: function(scripts, url, wrappedContentWin, chromeWin) {
    var sandbox;
    var script;
    var logger;
    var console;
    var storage;
    var xmlhttpRequester;
    var resources;
    var unsafeContentWin = wrappedContentWin.wrappedJSObject;

    // detect and grab reference to firebug console and context, if it exists
    var firebugConsole = this.getFirebugConsole(unsafeContentWin, chromeWin);

    for (var i = 0; script = scripts[i]; i++) {
      sandbox = new Components.utils.Sandbox(wrappedContentWin);

      logger = new GM_ScriptLogger(script);

      console = firebugConsole ? firebugConsole : new GM_console(script);

      storage = new GM_ScriptStorage(script);
      xmlhttpRequester = new GM_xmlhttpRequester(unsafeContentWin,
                                                 appSvc.hiddenDOMWindow,
                                                 url);
      resources = new GM_Resources(script);

      sandbox.unsafeWindow = unsafeContentWin;

      // hack XPathResult since that is so commonly used
      sandbox.XPathResult = Ci.nsIDOMXPathResult;

      // add our own APIs
      sandbox.GM_addStyle = function(css) {
            GM_addStyle(wrappedContentWin.document, css);
          };
      sandbox.GM_log = GM_hitch(logger, "log");
      sandbox.console = console;
      sandbox.GM_setValue = GM_hitch(storage, "setValue");
      sandbox.GM_getValue = GM_hitch(storage, "getValue");
      sandbox.GM_deleteValue = GM_hitch(storage, "deleteValue");
      sandbox.GM_listValues = GM_hitch(storage, "listValues");
      sandbox.GM_getResourceURL = GM_hitch(resources, "getResourceURL");
      sandbox.GM_getResourceText = GM_hitch(resources, "getResourceText");
      sandbox.GM_openInTab = GM_hitch(
          this, "openInTab", wrappedContentWin, chromeWin);
      sandbox.GM_xmlhttpRequest = GM_hitch(xmlhttpRequester,
                                           "contentStartRequest");
      sandbox.GM_registerMenuCommand = GM_hitch(
          this, "registerMenuCommand", wrappedContentWin, chromeWin, script);

      // Re-wrap the window before assigning it to the sandbox.__proto__
      // This is a workaround for a bug in which the Security Manager
      // vetoes the use of eval.
      sandbox.__proto__ = new XPCNativeWrapper(unsafeContentWin);

      Components.utils.evalInSandbox(
          "var document = window.document;", sandbox);

      var contents = script.textContent;

      var requires = [];
      var offsets = [];
      var offset = 0;

      script.requires.forEach(function(req){
        var contents = req.textContent;
        var lineCount = contents.split("\n").length;
        requires.push(contents);
        offset += lineCount;
        offsets.push(offset);
      });
      script.offsets = offsets;

      var scriptSrc = "\n" + // error line-number calculations depend on these
                         requires.join("\n") +
                         "\n" +
                         contents +
                         "\n";
      if (!script.unwrap)
        scriptSrc = "(function(){"+ scriptSrc +"})()";
      if (!this.evalInSandbox(scriptSrc, sandbox, script) && script.unwrap)
        this.evalInSandbox("(function(){"+ scriptSrc +"})()",
            sandbox, script); // wrap anyway on early return
    }
  },

  registerMenuCommand: function(
      wrappedContentWin, chromeWin, script,
      commandName, commandFunc, accessKey, unused, accessKey2) {
    if (!GM_apiLeakCheck("GM_registerMenuCommand")) {
      return;
    }

    if (wrappedContentWin.top != wrappedContentWin) {
      // Only register menu commands for the top level window.
      return;
    }

    // Legacy support: if all five parameters were specified, (from when two
    // were for accelerators) use the last one as the access key.
    if ('undefined' != typeof accessKey2) {
      accessKey = accessKey2;
    }

    if (accessKey
        && (("string" != typeof accessKey) || (accessKey.length != 1))
    ) {
      throw new Error('Error with menu command "'
          + commandName + '": accessKey must be a single character');
    }

    var command = {
        name: commandName,
        accessKey: accessKey,
        commandFunc: commandFunc,
        contentWindow: wrappedContentWin,
        contentWindowId: GM_windowId(wrappedContentWin),
        frozen: false};
    gMenuCommands.push(command);
  },

  openInTab: function(safeContentWin, chromeWin, url) {
    if (!GM_apiLeakCheck("GM_openInTab")) {
      return undefined;
    }

    var newTab = chromeWin.openNewTabWith(
      url, safeContentWin.document, null, null, null, null);
    if (!newTab) return;  // See: #1275
    // Source:
    // http://mxr.mozilla.org/mozilla-central/source/browser/base/content/browser.js#4448
    var newWindow = chromeWin.gBrowser
      .getBrowserForTab(newTab)
      .docShell
      .QueryInterface(Ci.nsIInterfaceRequestor)
      .getInterface(Ci.nsIDOMWindow);
    return newWindow;
  },

  evalInSandbox: function(code, sandbox, script) {
    if (!(Components.utils && Components.utils.Sandbox)) {
      var e = new Error("Could not create sandbox.");
      GM_logError(e, 0, e.fileName, e.lineNumber);
      return true;
    }
    try {
      // workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=307984
      var lineFinder = new Error();
      Components.utils.evalInSandbox(code, sandbox, maxJSVersion);
    } catch (e) { // catches errors while running the script code
      try {
        if (e && "return not in function" == e.message)
          return false; // means this script depends on the function enclosure

        // try to find the line of the actual error line
        var line = e && e.lineNumber;
        if (line > 0xFFFFFF00) {
          // Line number is reported as a huge int in edge cases.  Sometimes
          // the right one is in the "location", instead.  Look there.
          if (e.location && e.location.lineNumber) {
            line = e.location.lineNumber;
          } else {
            // Reporting maxint is useless, if we couldn't find it in location
            // either, forget it.  A value of 0 isn't shown in the console.
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
            script.fileURL,
            0
          );
        }
      } catch (e) { // catches errors we cause trying to inform the user
        // Do nothing. More importantly: don't stop script incovation sequence.
      }
    }
    return true; // did not need a (function() {...})() enclosure.
  },

  findError: function(script, lineNumber) {
    var start = 0;
    var end = 1;

    for (var i = 0; i < script.offsets.length; i++) {
      end = script.offsets[i];
      if (lineNumber <= end) {
        return {
          uri: script.requires[i].fileURL,
          lineNumber: (lineNumber - start)
        };
      }
      start = end;
    }

    return {
      uri: script.fileURL,
      lineNumber: (lineNumber - end)
    };
  },

  getFirebugConsole: function(unsafeContentWin, chromeWin) {
    // If we can't find this object, there's no chance the rest of this
    // function will work.
    if ('undefined'==typeof chromeWin.Firebug) return null;

    try {
      chromeWin = chromeWin.top;
      var fbVersion = parseFloat(chromeWin.Firebug.version, 10);
      var fbConsole = chromeWin.Firebug.Console;
      var fbContext = chromeWin.TabWatcher &&
        chromeWin.TabWatcher.getContextByWindow(unsafeContentWin);

      // Firebug 1.4 will give no context, when disabled for the current site.
      // We can't run that way.
      if ('undefined'==typeof fbContext) {
        return null;
      }

      function findActiveContext() {
        for (var i=0; i<fbContext.activeConsoleHandlers.length; i++) {
          if (fbContext.activeConsoleHandlers[i].window == unsafeContentWin) {
            return fbContext.activeConsoleHandlers[i];
          }
        }
        return null;
      }

      if (!fbConsole.isEnabled(fbContext)) return null;

      if (1.2 == fbVersion) {
        var safeWin = new XPCNativeWrapper(unsafeContentWin);

        if (fbContext.consoleHandler) {
          for (var i = 0; i < fbContext.consoleHandler.length; i++) {
            if (fbContext.consoleHandler[i].window == safeWin) {
              return fbContext.consoleHandler[i].handler;
            }
          }
        }

        var dummyElm = safeWin.document.createElement("div");
        dummyElm.setAttribute("id", "_firebugConsole");
        safeWin.document.documentElement.appendChild(dummyElm);
        chromeWin.Firebug.Console.injector.addConsoleListener(fbContext, safeWin);
        dummyElm.parentNode.removeChild(dummyElm);

        return fbContext.consoleHandler.pop().handler;
      } else if (fbVersion >= 1.3) {
        fbConsole.injector.attachIfNeeded(fbContext, unsafeContentWin);
        return findActiveContext();
      }
    } catch (e) {
      dump('Greasemonkey getFirebugConsole() error:\n'+uneval(e)+'\n');
    }

    return null;
  }
};

if (XPCOMUtils.generateNSGetFactory) {
  // Firefox >= 4
  var NSGetFactory = XPCOMUtils.generateNSGetFactory([GM_GreasemonkeyService]);
} else {
  // Firefox <= 3.6.*
  var NSGetModule = XPCOMUtils.generateNSGetModule([GM_GreasemonkeyService]);
}
