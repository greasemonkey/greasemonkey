Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import('resource://greasemonkey/util.js');

const Cc = Components.classes;
const Ci = Components.interfaces;
const schemeName = 'greasemonkey-script';
const ioService = Cc['@mozilla.org/network/io-service;1']
    .getService(Ci.nsIIOService);


function ScriptChannel(aUri, aScript) {
  // nsIRequest
  this.loadFlags = 0;
  this.loadGroup = null;
  this.name = aUri.spec;
  this.status = 200;

  this.content = '';
  if (aScript) {
    this.content = GM_util.getScriptSource(aScript);
  } else {
    this.status = 404;
  }

  if (aUri.spec.match(/\?.*wrapped=1/)) {
    this.content = GM_util.anonWrap(this.content);
  }

  // nsIChannel
  this.contentCharset = 'utf-8';
  this.contentLength = this.content.length;
  this.contentType = 'application/javascript';
  this.notificationCallbacks = null;
  this.originalURI = aUri;
  this.owner = null;
  this.securityInfo = null;
  this.URI = aUri;

  this.pipe = Cc['@mozilla.org/pipe;1'].createInstance(Ci.nsIPipe);
  this.pipe.init(true, true, 0, 0, null);

  var inputStreamChannel = Cc['@mozilla.org/network/input-stream-channel;1']
      .createInstance(Ci.nsIInputStreamChannel);
  inputStreamChannel.setURI(aUri);
  inputStreamChannel.contentStream = this.pipe.inputStream;
  this.channel = inputStreamChannel.QueryInterface(Ci.nsIChannel);
}

// nsIChannel
ScriptChannel.prototype.asyncOpen = function(aListener, aContext) {
  this.channel.asyncOpen(aListener, aContext);
  this.pipe.outputStream.write(this.content, this.content.length);
  this.pipe.outputStream.close();
};


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
  var script = GM_util.getService().config.getMatchingScripts(function(script) {
    return script.uuid == m[1];
  })[0];
  if (aUri.spec.match(/\.user\.js($|\?)/)) {
    return new ScriptChannel(aUri, script);
  } else if (script) {
    for (var i = 0, resource = null; resource = script.resources[i]; i++) {
      if (resource.name == m[2]) {
        return ioService.newChannelFromURI(
            GM_util.getUriFromFile(resource.file));
      }
    }
  } else {
    return new ScriptChannel(aUri, script);
  }
};


const components = [ScriptProtocol];
if ("generateNSGetFactory" in XPCOMUtils) {
  var NSGetFactory = XPCOMUtils.generateNSGetFactory(components); // Gecko 2.0+
} else {
  var NSGetModule = XPCOMUtils.generateNSGetModule(components); // Gecko 1.9.x
}
