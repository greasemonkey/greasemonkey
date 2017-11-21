/*
This file is responsible for providing the GM.xmlHttpRequest API method.  It
listens for a connection on a Port, and
*/

// Private implementation.
(function() {

function onUserScriptXhr(port) {
  if (port.name != 'UserScriptXhr') return;

  let xhr = new XMLHttpRequest();
  port.onMessage.addListener(msg => {
    switch (msg.name) {
      case 'open': open(xhr, msg.details, port); break;
      default:
        console.warn('UserScriptXhr port un-handled message name:', msg.name);
    }
  });
}
chrome.runtime.onConnect.addListener(onUserScriptXhr);


function open(xhr, d, port) {
  function xhrEventHandler(src, event) {
    console.log('xhr event;', src, event);
    var responseState = {
      context: d.context || null,
      finalUrl: null,
      lengthComputable: null,
      loaded: null,
      readyState: xhr.readyState,
      response: xhr.response,
      responseHeaders: null,
      responseText: null,
      responseXML: null,
      status: null,
      statusText: null,
      total: null
    };

    try {
      responseState.responseText = xhr.responseText;
    } catch (e) {
      // Some response types don't have .responseText (but do have e.g. blob
      // .response).  Ignore.
    }

    var responseXML = null;
    try {
      responseXML = xhr.responseXML;
    } catch (e) {
      // Ignore failure.  At least in responseType blob case, this access fails.
    }

    switch (event.type) {
      case "progress":
        responseState.lengthComputable = evt.lengthComputable;
        responseState.loaded = evt.loaded;
        responseState.total = evt.total;
        break;
      case "error":
        console.log('error event?', event);
        break;
      default:
        if (4 != xhr.readyState) break;
        responseState.responseHeaders = xhr.getAllResponseHeaders();
        responseState.status = xhr.status;
        responseState.statusText = xhr.statusText;
        break;
    }
    responseState.finalUrl = xhr.responseURL;

    port.postMessage(
        {src: src, type: event.type, responseState: responseState});
  }

  [
    'abort', 'error', 'load', 'loadend', 'loadstart', 'progress',
    'readystatechange', 'timeout'
  ].forEach(v => {
    if (d['on' + v]) {
      xhr.addEventListener(v, xhrEventHandler.bind(null, 'down'));
    }
  });

  [
    'abort', 'error', 'load', 'loadend', 'progress', 'timeout'
  ].forEach(v => {
    if (d.upload['on' + v]) {
      xhr.upload.addEventListener(v, xhrEventHandler.bind(null, 'up'));
    }
  });

  xhr.open(d.method, d.url, !d.synchronous, d.user || '', d.password || '');

  xhr.mozBackgroundRequest = !!d.mozBackgroundRequest;
  d.overrideMimeType && xhr.overrideMimeType(d.overrideMimeType);
  d.responseType && (xhr.responseType = d.responseType);
  d.timeout && (xhr.timeout = d.timeout);

  if (d.headers) {
    for (var prop in d.headers) {
      if (Object.prototype.hasOwnProperty.call(d.headers, prop)) {
        xhr.setRequestHeader(prop, d.headers[prop]);
      }
    }
  }

  var body = d.data || null;
  if (d.binary && (body !== null)) {
    var bodyLength = body.length;
    var bodyData = new Uint8Array(bodyLength);
    for (var i = 0; i < bodyLength; i++) {
      bodyData[i] = body.charCodeAt(i) & 0xff;
    }
    xhr.send(new Blob([bodyData]));
  } else {
    xhr.send(body);
  }
}

})();
