function GM_xmlhttpRequester(unsafeContentWin, chromeWindow) {
  this.unsafeContentWin = unsafeContentWin;
  this.chromeWindow = chromeWindow;
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

  // Store this value by looking at it exactly once, and guaranteeing (via null
  // prepend) that it is a string, and not an object that might play tricks
  // with multiple .toString() calls.
  var url = '' + details.url;

  try {
    var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                    .getService(Components.interfaces.nsIIOService);
    var scheme = ioService.extractScheme(url);
  } catch (e) {
    // A malformed URL won't be parsed properly.
    throw new Error('Invalid URL: '+url);
  }

  // This is important - without it, GM_xmlhttpRequest can be used to get
  // access to things like files and chrome. Careful.
  switch (scheme) {
    case "http":
    case "https":
    case "ftp":
        var req = new this.chromeWindow.XMLHttpRequest();
        GM_hitch(this, "chromeStartRequest", url, details, req)();
      break;
    default:
      throw new Error("Invalid url: " + url);
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

  this.setupRequestEvent(this.unsafeContentWin, req, "onload", details);
  this.setupRequestEvent(this.unsafeContentWin, req, "onerror", details);
  this.setupRequestEvent(this.unsafeContentWin, req, "onreadystatechange",
                         details);

  req.open(details.method, safeUrl);

  if (details.overrideMimeType) {
    req.overrideMimeType(details.overrideMimeType);
  }

  if (details.headers) {
    for (var prop in details.headers) {
      req.setRequestHeader(prop, details.headers[prop]);
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

  if (details[event]) {
    req[event] = function() {
      GM_log("> GM_xmlhttpRequester -- callback for " + event);

      var responseState = {
        // can't support responseXML because security won't
        // let the browser call properties on it
        responseText: req.responseText,
        readyState: req.readyState,
        responseHeaders: null,
        status: null,
        statusText: null,
        finalUrl: null
      };
      if (4 == req.readyState && 'onerror' != event) {
        responseState.responseHeaders = req.getAllResponseHeaders();
        responseState.status = req.status;
        responseState.statusText = req.statusText;
        responseState.finalUrl = req.channel.URI.spec;
      }

      // Pop back onto browser thread and call event handler.
      // Have to use nested function here instead of GM_hitch because
      // otherwise details[event].apply can point to window.setTimeout, which
      // can be abused to get increased priveledges.
      new XPCNativeWrapper(unsafeContentWin, "setTimeout()")
        .setTimeout(function(){details[event](responseState);}, 0);

      GM_log("< GM_xmlhttpRequester -- callback for " + event);
    }
  }

  GM_log("< GM_xmlhttpRequester.setupRequestEvent");
};
