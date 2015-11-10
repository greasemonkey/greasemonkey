var EXPORTED_SYMBOLS = ['initScriptProtocol'];

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import('chrome://greasemonkey-modules/content/util.js');

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;
var schemeName = 'greasemonkey-script';


var gHaveDoneInit = false;
var gScope = this;

function initScriptProtocol() {
  if (gHaveDoneInit) return;
  gHaveDoneInit = true;
  ScriptProtocol.init();
}

////////////////////////////////////////////////////////////////////////////////

function DummyChannel(aUri, aScript) {
  // nsIRequest
  this.loadFlags = 0;
  this.loadGroup = null;
  this.name = aUri.spec;
  this.status = 404;
  this.content = '';

  // nsIChannel
  this.contentCharset = 'utf-8';
  this.contentLength = this.content.length;
  this.contentType = 'application/javascript';
  this.notificationCallbacks = null;
  this.originalURI = aUri;
  this.owner = null;
  this.securityInfo = null;
  this.URI = aUri;
}

// nsIChannel
DummyChannel.prototype.asyncOpen = function(aListener, aContext) { };

////////////////////////////////////////////////////////////////////////////////

var ScriptProtocol = {
  _classDescription: 'Protocol handler for "greasemonkey-script:"',
  _classID: Components.ID('20d898f3-2fb8-4b3a-b8c7-7ad6c2c48598'),
  _contractID:  '@mozilla.org/network/protocol;1?name=' + schemeName,

  QueryInterface: XPCOMUtils.generateQI([
      Ci.nsIFactory,
      Ci.nsIProtocolHandler,
      Ci.nsISupportsWeakReference
      ]),

  init: function() {
    try {
      var registrar = Components.manager.QueryInterface(
          Ci.nsIComponentRegistrar);
      registrar.registerFactory(
          this._classID, this._classDescription, this._contractID, this);
    } catch (e) {
      if ('NS_ERROR_FACTORY_EXISTS' == e.name) {
        // No-op, ignore these.  But why do they happen!?
      } else {
        dump('Error registering ScriptProtocol factory:\n' + e + '\n');
      }
      return;
    };
  },

////////////////////////////////// nsIFactory //////////////////////////////////

  createInstance: function(outer, iid) {
    if (outer) {
      throw Cr.NS_ERROR_NO_AGGREGATION;
    }
    return this.QueryInterface(iid);
  },

////////////////////////////// nsIProtocolHandler //////////////////////////////

  scheme: schemeName,
  defaultPort: -1,
  protocolFlags: 0
      | Ci.nsIProtocolHandler.URI_INHERITS_SECURITY_CONTEXT
      | Ci.nsIProtocolHandler.URI_IS_LOCAL_RESOURCE
      | Ci.nsIProtocolHandler.URI_LOADABLE_BY_ANYONE
      | Ci.nsIProtocolHandler.URI_NOAUTH
      | Ci.nsIProtocolHandler.URI_NON_PERSISTABLE
      | Ci.nsIProtocolHandler.URI_NORELATIVE
      ,

  allowPort: function(aPort, aScheme) {
    return false;
  },

  newURI: function(aSpec, aCharset, aBaseUri) {
    var uri = Cc['@mozilla.org/network/simple-uri;1']
        .createInstance(Ci.nsIURI);
    uri.spec = aSpec;
    return uri;
  },

  newChannel: function(aUri) {
    var m = aUri.spec.match(/greasemonkey-script:([-0-9a-f]+)\/(.*)/);
    var dummy = new DummyChannel(aUri);

    // Incomplete URI, send a 404.
    if (!m) return dummy;

    var script = null;
    // If we're serving (e.g.) a favicon image, this request can be coming
    // from the parent process!
    var runtime = Cc["@mozilla.org/xre/app-info;1"]
        .getService(Ci.nsIXULRuntime);
    if (runtime.processType == Ci.nsIXULRuntime.PROCESS_TYPE_DEFAULT) {
      var scripts = GM_util.getService().config.getMatchingScripts(
          function(script) { return script.uuid == m[1]; }
      );
      script = scripts && scripts.length && scripts[0];
    } else {
      var mm = Cc["@mozilla.org/childprocessmessagemanager;1"]
          .getService(Ci.nsISyncMessageSender);
      var response = mm.sendSyncMessage(
          'greasemonkey:scripts-for-uuid', {'uuid': m[1]});
      // We expect exactly one response, listing exactly one script.
      if (response.length != 1) return dummy;
      if (response[0].length != 1) return dummy;
      script = response[0][0];
    }

    // Fail fast if we couldn't find the script.
    if (!script) return dummy;

    for (var i = 0, resource = null; resource = script.resources[i]; i++) {
      if (resource.name == m[2]) {
        var uri = null;
        if (resource.url) {
          // In child scope, IPCScript gives us the URL to the file.
          uri = GM_util.uriFromUrl(resource.url);
        } else {
          // In parent scope we have the raw script, with file intact.
          uri = GM_util.getUriFromFile(resource.file);
        }

        // Get the channel for the file URI, but set its originalURI to the
        // greasemonkey-script: protocol URI, to ensure it can still be loaded
        // in unprivileged contexts (bug #2326).
        var channel = GM_util.channelFromUri(uri);
        channel.originalURI = aUri;

        return channel;
      }
    }

    // Default fall-through case, send a 404.
    return dummy;
  }
};
