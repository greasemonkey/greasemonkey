var EXPORTED_SYMBOLS = ['GM_xmlhttpRequester'];

Components.utils.import("resource://greasemonkey/util.js");

function GM_xmlhttpRequester(wrappedContentWin, chromeWindow, originUrl) {
  this.wrappedContentWin = wrappedContentWin;
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
  if (!GM_util.apiLeakCheck("GM_xmlhttpRequest", arguments)) {
    return;
  }

  try {
    // Validate and parse the (possibly relative) given URL.
    var uri = GM_util.uriFromUrl(details.url, this.originUrl);
    var url = uri.spec;
  } catch (e) {
    // A malformed URL won't be parsed properly.
    throw new Error(
        this.stringBundle.GetStringFromName('error.invalidUrl')
            .replace('%1', name)
        );
  }

  // This is important - without it, GM_xmlhttpRequest can be used to get
  // access to things like files and chrome. Careful.
  switch (uri.scheme) {
    case "http":
    case "https":
    case "ftp":
        var req = new this.chromeWindow.XMLHttpRequest();
        GM_util.hitch(this, "chromeStartRequest", url, details, req)();
      break;
    default:
      throw new Error(
          this.stringBundle.GetStringFromName('error.disallowedScheme')
              .replace('%1', details.url)
          );
  }

  var rv = {
    __exposedProps__: {
        finalUrl: "r",
        readyState: "r",
        responseHeaders: "r",
        responseText: "r",
        status: "r",
        statusText: "r",
        abort: "r"
        },
    abort: function () { return req.abort(); }
  };
  if (!!details.synchronous) {
    rv.finalUrl = req.finalUrl;
    rv.readyState = req.readyState;
    rv.responseHeaders = req.getAllResponseHeaders();
    rv.responseText = req.responseText;
    rv.status = req.status;
    rv.statusText = req.statusText;
  }
  return rv;
};

// this function is intended to be called in chrome's security context, so
// that it can access other domains without security warning
GM_xmlhttpRequester.prototype.chromeStartRequest =
function(safeUrl, details, req) {
  this.setupReferer(details, req);

  var setupRequestEvent = GM_util.hitch(
      this, 'setupRequestEvent', this.wrappedContentWin);

  setupRequestEvent(req, "abort", details);
  setupRequestEvent(req, "error", details);
  setupRequestEvent(req, "load", details);
  setupRequestEvent(req, "progress", details);
  setupRequestEvent(req, "readystatechange", details);
  setupRequestEvent(req, "timeout", details);
  if (details.upload) {
    setupRequestEvent(req.upload, "abort", details.upload);
    setupRequestEvent(req.upload, "error", details.upload);
    setupRequestEvent(req.upload, "load", details.upload);
    setupRequestEvent(req.upload, "progress", details.upload);
  }

  req.mozBackgroundRequest = !!details.mozBackgroundRequest;

  req.open(details.method, safeUrl,
      !details.synchronous, details.user || "", details.password || "");

  if (details.overrideMimeType) {
    req.overrideMimeType(details.overrideMimeType);
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
// Firefox does not let chrome JS set the "Referer" HTTP heade via XHR
// directly. However, we can still set it indirectly via an
// http-on-modify-request observer.
GM_xmlhttpRequester.prototype.setupReferer =
function(details, req) {
  if (!details.headers || !details.headers.Referer) return;

  var observerService = Components.classes["@mozilla.org/observer-service;1"]
      .getService(Components.interfaces.nsIObserverService);
  var requestObserver = {};
  requestObserver.observe = function(subject, topic, data) {
      observerService.removeObserver(requestObserver, "http-on-modify-request");

      var channel = subject.QueryInterface(Components.interfaces.nsIChannel);
      if (channel == req.channel) {
        var httpChannel = subject.QueryInterface(
            Components.interfaces.nsIHttpChannel);
        httpChannel.setRequestHeader("Referer", details.headers.Referer, false);
      }
    };
  observerService.addObserver(requestObserver, "http-on-modify-request", false);
};

// arranges for the specified 'event' on xmlhttprequest 'req' to call the
// method by the same name which is a property of 'details' in the content
// window's security context.
GM_xmlhttpRequester.prototype.setupRequestEvent =
function(wrappedContentWin, req, event, details) {
  if (!details["on" + event]) return;

  req.addEventListener(event, function(evt) {
    var responseState = {
      __exposedProps__: {
          context: "r",
          finalUrl: "r",
          lengthComputable: "r",
          loaded: "r",
          readyState: "r",
          responseHeaders: "r",
          responseText: "r",
          status: "r",
          statusText: "r",
          total: "r",
          },
      context: details.context || null,
      // Can't support responseXML because security won't
      // let the browser call properties on it.
      responseText: req.responseText,
      readyState: req.readyState,
      responseHeaders: null,
      status: null,
      statusText: null,
      finalUrl: null
    };

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

    if (GM_util.windowIsClosed(wrappedContentWin)) {
      return;
    }

    // Pop back onto browser thread and call event handler.
    // Have to use nested function here instead of GM_util.hitch because
    // otherwise details[event].apply can point to window.setTimeout, which
    // can be abused to get increased privileges.
    new XPCNativeWrapper(wrappedContentWin, "setTimeout()")
      .setTimeout(function(){ details["on" + event](responseState); }, 0);
  }, false);
};
