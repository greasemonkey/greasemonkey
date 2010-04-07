function GM_xmlhttpRequester(unsafeContentWin, chromeWindow, originUrl) {
  this.unsafeContentWin = unsafeContentWin;
  this.chromeWindow = chromeWindow;
  this.originUrl = originUrl;
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
  if (!GM_apiLeakCheck("GM_xmlhttpRequest")) {
    return;
  }

  GM_log("> GM_xmlhttpRequest.contentStartRequest");

  var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                  .getService(Components.interfaces.nsIIOService);
  try {
    // Validate and parse the (possibly relative) given URL.
    var originUri = ioService.newURI(this.originUrl, null, null);
    var uri = ioService.newURI(details.url, null, originUri);
    var url = uri.spec;
  } catch (e) {
    // A malformed URL won't be parsed properly.
    throw new Error("Invalid URL: " + details.url);
  }

  // This is important - without it, GM_xmlhttpRequest can be used to get
  // access to things like files and chrome. Careful.
  switch (uri.scheme) {
    case "http":
    case "https":
    case "ftp":
        var req = new this.chromeWindow.XMLHttpRequest();
        GM_hitch(this, "chromeStartRequest", url, details, req)();
      break;
    default:
      throw new Error("Disallowed scheme in URL: " + details.url);
  }

  GM_log("< GM_xmlhttpRequest.contentStartRequest");

  return {
    abort: function() {
      req.abort();
    }
  };
};

// this function is intended to be called in chrome's security context, so
// that it can access other domains without security warning
GM_xmlhttpRequester.prototype.chromeStartRequest =
function(safeUrl, details, req) {
  GM_log("> GM_xmlhttpRequest.chromeStartRequest");

  this.setupRequestEvent(this.unsafeContentWin, req, "load", details);
  this.setupRequestEvent(this.unsafeContentWin, req, "error", details);
  this.setupRequestEvent(this.unsafeContentWin, req, "readystatechange",
                         details);
  this.setupRequestEvent(this.unsafeContentWin, req, "progress", details);
  this.setupRequestEvent(this.unsafeContentWin, req, "abort", details);

  // Let users attach upload events
  if (details.uploadProgress) {
    // xhr supports upload events?
    if (!req.upload) {
            var err = new Error("Unavailable feature: " +
              "This version of Firefox does not support upload events " +
              "(you should consider upgrading to version 3.5 or newer.)");
            GM_logError(err);
            throw err;
    }

    this.setupRequestEvent(this.unsafeContentWin, req.upload, "progress", details.uploadProgress);
    this.setupRequestEvent(this.unsafeContentWin, req.upload, "load", details.uploadProgress);
    this.setupRequestEvent(this.unsafeContentWin, req.upload, "error", details.uploadProgress);
    this.setupRequestEvent(this.unsafeContentWin, req.upload, "abort", details.uploadProgress);
  } 

  req.open(details.method, safeUrl);

  if (details.overrideMimeType) {
    req.overrideMimeType(details.overrideMimeType);
  }

  if (details.headers) {
    for (var prop in details.headers) {
      if (details.headers.hasOwnProperty(prop)) {
        req.setRequestHeader(prop, details.headers[prop]);
      }
    }
  }

  var body = details.data ? details.data : null;
  if (details.binary) {
    // xhr supports binary?
    if (!req.sendAsBinary) {
      var err = new Error("Unavailable feature: " +
              "This version of Firefox does not support sending binary data " +
              "(you should consider upgrading to version 3 or newer.)");
      GM_logError(err);
      throw err;
    }
    req.sendAsBinary(body);
  } else {
    req.send(body);
  }

  GM_log("< GM_xmlhttpRequest.chromeStartRequest");
}

// arranges for the specified 'event' on xmlhttprequest 'req' to call the
// method by the same name which is a property of 'details' in the content
// window's security context.
GM_xmlhttpRequester.prototype.setupRequestEvent =
function(unsafeContentWin, req, event, details) {
  GM_log("> GM_xmlhttpRequester.setupRequestEvent");

  if (details["on" + event]) {
    req.addEventListener(event, function(evt) {
      GM_log("> GM_xmlhttpRequester -- callback for " + event);

      var responseState = {
        // can't support responseXML because security won't
        // let the browser call properties on it
        responseText: evt.responseText,
        readyState: evt.readyState,
        responseHeaders: null,
        status: null,
        statusText: null,
        finalUrl: null
      };

      if ("progress" == event && evt.lengthComputable) {
        responseState.loaded = evt.loaded;
        responseState.total = evt.total;
      } else if (4 == evt.readyState && 'onerror' != event) {
        responseState.responseHeaders = evt.getAllResponseHeaders();
        responseState.status = evt.status;
        responseState.statusText = evt.statusText;
        responseState.finalUrl = evt.channel.URI.spec;
      }

      // Pop back onto browser thread and call event handler.
      // Have to use nested function here instead of GM_hitch because
      // otherwise details[event].apply can point to window.setTimeout, which
      // can be abused to get increased priveledges.
      new XPCNativeWrapper(unsafeContentWin, "setTimeout()")
        .setTimeout(function(){details["on" + event](responseState);}, 0);

      GM_log("< GM_xmlhttpRequester -- callback for " + event);
    }, false);
  }

  GM_log("< GM_xmlhttpRequester.setupRequestEvent");
};
