/*
This file is responsible for providing the GM.xmlHttpRequest API method.  It
listens for a connection on a Port, and
*/

// Private implementation.
(function() {

function onUserScriptXhr(port) {
  if (port.name != 'UserScriptXhr') return;

  let xhr = new XMLHttpRequest();
  port.onMessage.addListener((msg, src) => {
    checkApiCallAllowed('GM.xmlHttpRequest', msg.uuid);
    switch (msg.name) {
      case 'open':
        open(xhr, msg.details, port, src.sender.tab.id);
        break;
      default:
        console.warn('UserScriptXhr port un-handled message name:', msg.name);
    }
  });
}
chrome.runtime.onConnect.addListener(onUserScriptXhr);

var headersToReplace = ['origin', 'referer', 'cookie'];
var dummyHeaderPrefix = 'x-greasemonkey-';

function open(xhr, d, port, tabId) {
  function xhrEventHandler(src, event) {
    var responseState = {
      context: d.context || null,
      finalUrl: xhr.responseURL,
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
        responseState.lengthComputable = event.lengthComputable;
        responseState.loaded = event.loaded;
        responseState.total = event.total;
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
  
  var hasCookies = false;
  if (d.headers) {
    for (var prop in d.headers) {
      if (Object.prototype.hasOwnProperty.call(d.headers, prop)) {
        var propLower = prop.toLowerCase();
        hasCookies = (propLower === 'cookie');
        if (headersToReplace.includes(propLower)) {
          xhr.setRequestHeader(dummyHeaderPrefix + propLower, d.headers[prop]);
        }
        else {
          xhr.setRequestHeader(prop, d.headers[prop]);
        }
      }
    }
  }

  chrome.tabs.get(tabId).then(tab => {
    chrome.cookies.getAll({url: tab.url}).then(cookies => {
      if (!hasCookies && d.usePageCookies) {
        let cookieStrings = [];
        for (let cookie of cookies) {
          cookieStrings.push(cookie.name + '=' + cookie.value + ';');
        }
        xhr.setRequestHeader(dummyHeaderPrefix + 'cookie', cookieStrings.join(' '));
      }
      var body = d.data || null;
      if (d.binary && (body !== null)) {
        var bodyLength = body.length;
        var bodyData = new Uint8Array(bodyLength);
        for (var i = 0; i < bodyLength; i++) {
          bodyData[i] = body.charCodeAt(i) & 0xff;
        }
        xhr.send(new Blob([bodyData]));
      }
      else {
        xhr.send(body);
      }
    });
  });
}

function getHeader(headers, name) {
  name = name.toLowerCase();
  for (var header of headers) {
    if (header.name.toLowerCase() === name) {
      return header;
    }
  }
  return null;
}

const extensionUrl = chrome.extension.getURL('');

function rewriteHeaders(e) {
  if (e.originUrl && e.originUrl.startsWith(extensionUrl)) {
    for (var name of headersToReplace) {
      var prefixedHeader = getHeader(e.requestHeaders, dummyHeaderPrefix + name);
      if (prefixedHeader) {
        if (!getHeader(e.requestHeaders, name)) {
          // only try to add real header if request doesn't already have it
          e.requestHeaders.push({name: name, value: prefixedHeader.value});
        }
        // remove the prefixed header regardless
        e.requestHeaders.splice(e.requestHeaders.indexOf(prefixedHeader), 1);
      }
    }
  }
  return { requestHeaders: e.requestHeaders };
}

chrome.webRequest.onBeforeSendHeaders.addListener(
  rewriteHeaders, {urls: ['<all_urls>'], types: ['xmlhttprequest']}, ['blocking', 'requestHeaders']
);

})();
