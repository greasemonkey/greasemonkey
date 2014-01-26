Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import('resource://greasemonkey/util.js');

const Cc = Components.classes;
const Ci = Components.interfaces;
const schemeName = 'greasemonkey-script';
const ioService = Cc['@mozilla.org/network/io-service;1']
    .getService(Ci.nsIIOService);


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


function ScriptProtocol() {}

// XPCOMUtils generation
ScriptProtocol.prototype.classDescription =
    'Protocol handler for greasemonkey-script:';
ScriptProtocol.prototype.classID =
    Components.ID('{20d898f3-2fb8-4b3a-b8c7-7ad6c2c48598}');
ScriptProtocol.prototype.contractID =
    '@mozilla.org/network/protocol;1?name=' + schemeName;
ScriptProtocol.prototype.QueryInterface = XPCOMUtils.generateQI([
    Components.interfaces.nsIProtocolHandler,
    Components.interfaces.nsISupports,
    ]);

// nsIProtocolHandler
ScriptProtocol.prototype.scheme = schemeName;
ScriptProtocol.prototype.defaultPort = -1;
ScriptProtocol.prototype.protocolFlags = 0
    | Ci.nsIProtocolHandler.URI_INHERITS_SECURITY_CONTEXT
    | Ci.nsIProtocolHandler.URI_IS_LOCAL_RESOURCE
    | Ci.nsIProtocolHandler.URI_LOADABLE_BY_ANYONE
    | Ci.nsIProtocolHandler.URI_NOAUTH
    | Ci.nsIProtocolHandler.URI_NON_PERSISTABLE
    | Ci.nsIProtocolHandler.URI_NORELATIVE
    ;

// nsIProtocolHandler
ScriptProtocol.prototype.allowPort = function(aPort, aScheme) {
  return false;
};

// nsIProtocolHandler
ScriptProtocol.prototype.newURI = function(aSpec, aCharset, aBaseUri) {
  var uri = Cc['@mozilla.org/network/simple-uri;1'].createInstance(Ci.nsIURI);
  uri.spec = aSpec;
  return uri;
};

// nsIProtocolHandler
ScriptProtocol.prototype.newChannel = function(aUri) {
  var m = aUri.spec.match(/greasemonkey-script:([-0-9a-f]+)\/(.*)/);

  // Incomplete URI, send a 404.
  if (!m) return new DummyChannel(aUri);

  var script = GM_util.getService().config.getMatchingScripts(function(script) {
    return script.uuid == m[1];
  })[0];

  if (script) {
    for (var i = 0, resource = null; resource = script.resources[i]; i++) {
      if (resource.name == m[2]) {
        return ioService.newChannelFromURI(
            GM_util.getUriFromFile(resource.file));
      }
    }
  }

  // Default fall-through case, send a 404.
  return new DummyChannel(aUri);
};

const components = [ScriptProtocol];
if ("generateNSGetFactory" in XPCOMUtils) {
  var NSGetFactory = XPCOMUtils.generateNSGetFactory(components); // Gecko 2.0+
} else {
  var NSGetModule = XPCOMUtils.generateNSGetModule(components); // Gecko 1.9.x
}
