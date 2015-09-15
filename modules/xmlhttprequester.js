var EXPORTED_SYMBOLS = ['GM_xmlhttpRequester'];

Components.utils.import("resource://gre/modules/PrivateBrowsingUtils.jsm");
Components.utils.import("chrome://greasemonkey-modules/content/util.js");

var gStringBundle = Components
    .classes["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .createBundle("chrome://greasemonkey/locale/greasemonkey.properties");


function GM_xmlhttpRequester(wrappedContentWin, originUrl, sandbox) {
  this.wrappedContentWin = wrappedContentWin;
  this.originUrl = originUrl;
  this.sandbox = sandbox;
  // Firefox < 29 (i.e. PaleMoon) does not support getObjectPrincipal in a
  // scriptable context.  Greasemonkey users on this platform otherwise would
  // use an older version without this check, so skipping is no worse.
  this.sandboxPrincipal = 'function' == typeof Components.utils.getObjectPrincipal
      ? Components.utils.getObjectPrincipal(sandbox) : null;
}

// this function gets called by user scripts in content security scope to
// start a cross-domain xmlhttp request.
//
// details should look like:
// {method,url,onload,onerror,onreadystatechange,headers,data}
// headers should be in the form {name:value,name:value,etc}
// can't support mimetype because i think it's only used for forcing
// text/xml and we can't support that
GM_xmlhttpRequester.prototype.contentStartRequest = function(details) {
  try {
    // Validate and parse the (possibly relative) given URL.
    var uri = GM_util.uriFromUrl(details.url, this.originUrl);
    var url = uri.spec;
  } catch (e) {
    // A malformed URL won't be parsed properly.
    throw new Error(
        gStringBundle.GetStringFromName('error.invalidUrl')
            .replace('%1', details.url)
        );
  }

  // This is important - without it, GM_xmlhttpRequest can be used to get
  // access to things like files and chrome. Careful.
  switch (uri.scheme) {
    case "http":
    case "https":
    case "ftp":
        var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
            .createInstance(Components.interfaces.nsIXMLHttpRequest);
        GM_util.hitch(this, "chromeStartRequest", url, details, req)();
      break;
    default:
      throw new Error(
          gStringBundle.GetStringFromName('error.disallowedScheme')
              .replace('%1', details.url)
          );
  }

  var rv = {
    abort: function () { return req.abort(); },
    finalUrl: null,
    readyState: null,
    responseHeaders: null,
    responseText: null,
    status: null,
    statusText: null
  };

  if (!!details.synchronous) {
    rv.finalUrl = req.finalUrl;
    rv.readyState = req.readyState;
    rv.responseHeaders = req.getAllResponseHeaders();
    try {
      rv.responseText = req.responseText;
    } catch (e) {
      // Some response types don't have .responseText (but do have e.g. blob
      // .response).  Ignore.
    }
    rv.status = req.status;
    rv.statusText = req.statusText;
  }

  rv = Components.utils.cloneInto({
    abort: rv.abort.bind(rv),
    finalUrl: rv.finalUrl,
    readyState: rv.readyState,
    responseHeaders: rv.responseHeaders,
    responseText: rv.responseText,
    status: rv.status,
    statusText: rv.statusText
  }, this.sandbox, {cloneFunctions: true});

  return rv;
};

// this function is intended to be called in chrome's security context, so
// that it can access other domains without security warning
GM_xmlhttpRequester.prototype.chromeStartRequest =
function(safeUrl, details, req) {
  this.setupReferer(details, req);

  var setupRequestEvent = GM_util.hitch(
      this, 'setupRequestEvent', this.wrappedContentWin, this.sandbox);

  setupRequestEvent(req, "abort", details);
  setupRequestEvent(req, "error", details);
  setupRequestEvent(req, "load", details);
  setupRequestEvent(req, "loadend", details);
  setupRequestEvent(req, "loadstart", details);
  setupRequestEvent(req, "progress", details);
  setupRequestEvent(req, "readystatechange", details);
  setupRequestEvent(req, "timeout", details);
  if (details.upload) {
    setupRequestEvent(req.upload, "abort", details.upload);
    setupRequestEvent(req.upload, "error", details.upload);
    setupRequestEvent(req.upload, "load", details.upload);
    setupRequestEvent(req.upload, "loadend", details.upload);
    setupRequestEvent(req.upload, "progress", details.upload);
    setupRequestEvent(req.upload, "timeout", details.upload);
  }

  req.mozBackgroundRequest = !!details.mozBackgroundRequest;

  req.open(details.method, safeUrl,
      !details.synchronous, details.user || "", details.password || "");

  var channel;

  var isPrivate = true;
  if (PrivateBrowsingUtils.isContentWindowPrivate) {
    // Firefox >= 35
    isPrivate = PrivateBrowsingUtils.isContentWindowPrivate(this.wrappedContentWin);
  } else {
    // Firefox <= 34; i.e. PaleMoon
    isPrivate = PrivateBrowsingUtils.isWindowPrivate(this.wrappedContentWin);
  }
  if (isPrivate) {
    channel = req.channel
        .QueryInterface(Components.interfaces.nsIPrivateBrowsingChannel);
    channel.setPrivate(true);
  }

  channel = req.channel
      .QueryInterface(Components.interfaces.nsIHttpChannelInternal);
  channel.forceAllowThirdPartyCookie = true;

  if (details.overrideMimeType) {
    req.overrideMimeType(details.overrideMimeType);
  }
  if (details.responseType) {
    req.responseType = details.responseType;
  }

  if (details.timeout) {
    req.timeout = details.timeout;
  }

  if ('redirectionLimit' in details) {
    try {
      var httpChannel = req.channel.QueryInterface(
          Components.interfaces.nsIHttpChannel);
      httpChannel.redirectionLimit = details.redirectionLimit;
    } catch (e) {
      // Ignore.
    }
  }

  if (details.headers) {
    var headers = details.headers;

    for (var prop in headers) {
      if (Object.prototype.hasOwnProperty.call(headers, prop)) {
        req.setRequestHeader(prop, headers[prop]);
      }
    }
  }

  var body = details.data ? details.data : null;
  if (details.binary) {
    req.sendAsBinary(body);
  } else {
    req.send(body);
  }
};

// sets the "Referer" HTTP header for this GM_XHR request.
// Firefox does not let chrome JS set the "Referer" HTTP header via XHR
// directly. However, we can still set it indirectly via an
// http-on-modify-request observer.
GM_xmlhttpRequester.prototype.setupReferer =
function(details, req) {
  if (!details.headers || !details.headers.Referer) return;
  
  var channel = req.channel;
  
  if(!(channel  instanceof Components.interfaces.nsIWritablePropertyBag))
    return;
  
  channel.setProperty("greasemonkey:referer-override", details.headers.Referer);  
};

// arranges for the specified 'event' on xmlhttprequest 'req' to call the
// method by the same name which is a property of 'details' in the content
// window's security context.
GM_xmlhttpRequester.prototype.setupRequestEvent =
function(wrappedContentWin, sandbox, req, event, details) {
  // Waive Xrays so that we can read callback function properties ...
  details = Components.utils.waiveXrays(details);
  var eventCallback = details["on" + event];
  if (!eventCallback) return;

  // ... but ensure that the callback came from a script, not content, by
  // checking that its principal equals that of the sandbox.
  if ('function' == typeof Components.utils.getObjectPrincipal) {
    // Firefox < 29; i.e. PaleMoon.
    var callbackPrincipal = Components.utils.getObjectPrincipal(eventCallback);
    if (!this.sandboxPrincipal.equals(callbackPrincipal)) return;
  }

  req.addEventListener(event, function(evt) {
    var responseState = {
      context: details.context || null,
      finalUrl: null,
      lengthComputable: null,
      loaded: null,
      readyState: req.readyState,
      response: req.response,
      responseHeaders: null,
      responseText: null,
      responseXML: null,
      status: null,
      statusText: null,
      total: null
    };

    try {
      responseState.responseText = req.responseText;
    } catch (e) {
      // Some response types don't have .responseText (but do have e.g. blob
      // .response).  Ignore.
    }

    var responseXML = null;
    try {
      responseXML = req.responseXML;
    } catch (e) {
      // Ignore failure.  At least in responseType blob case, this access fails.
    }
    if (responseXML) {
      // Clone the XML object into a content-window-scoped document.
      var xmlDoc = new wrappedContentWin.Document();
      var clone = xmlDoc.importNode(responseXML.documentElement, true);
      xmlDoc.appendChild(clone);
      responseState.responseXML = xmlDoc;
    }

    switch (event) {
      case "progress":
        responseState.lengthComputable = evt.lengthComputable;
        responseState.loaded = evt.loaded;
        responseState.total = evt.total;
        break;
      case "error":
        break;
      default:
        if (4 != req.readyState) break;
        responseState.responseHeaders = req.getAllResponseHeaders();
        responseState.status = req.status;
        responseState.statusText = req.statusText;
        responseState.finalUrl = req.channel.URI.spec;
        break;
    }

    responseState = Components.utils.cloneInto({
      context: responseState.context,
      finalUrl: responseState.finalUrl,
      lengthComputable: responseState.lengthComputable,
      loaded: responseState.loaded,
      readyState: responseState.readyState,
      response: responseState.response,
      responseHeaders: responseState.responseHeaders,
      responseText: responseState.responseText,
      responseXML: responseState.responseXML,
      status: responseState.status,
      statusText: responseState.statusText,
      total: responseState.total
    }, sandbox, {cloneFunctions: true, wrapReflectors: true});

    if (GM_util.windowIsClosed(wrappedContentWin)) {
      return;
    }

    // Pop back onto browser thread and call event handler.
    // Have to use nested function here instead of GM_util.hitch because
    // otherwise details[event].apply can point to window.setTimeout, which
    // can be abused to get increased privileges.
    new XPCNativeWrapper(wrappedContentWin, "setTimeout()")
      .setTimeout(function(){ eventCallback.call(details, responseState); }, 0);
  }, false);
};
