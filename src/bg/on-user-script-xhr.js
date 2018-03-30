'use strict';
/*
This file is responsible for providing the GM.xmlHttpRequest API method.  It
listens for a connection on a Port, and
*/

// Private implementation.
(function() {

const gExtensionUrl = chrome.extension.getURL('');
const gHeadersToReplace = ['cookie', 'origin', 'referer'];
const gDummyHeaderPrefix = 'x-greasemonkey-';


function onUserScriptXhr(port) {
  if (port.name != 'UserScriptXhr') return;

  let xhr = new XMLHttpRequest();
  port.onMessage.addListener((msg, src) => {
    checkApiCallAllowed('GM.xmlHttpRequest', msg.uuid);
    switch (msg.name) {
      case 'open':
        open(xhr, msg.details, port, src.sender.tab.url);
        break;
      default:
        console.warn('UserScriptXhr port un-handled message name:', msg.name);
    }
  });
}
chrome.runtime.onConnect.addListener(onUserScriptXhr);


function open(xhr, d, port, tabUrl) {
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

  let hasCookieHeader = false;
  if (d.headers) {
    for (let prop in d.headers) {
      if (Object.prototype.hasOwnProperty.call(d.headers, prop)) {
        let propLower = prop.toLowerCase();
        hasCookieHeader = (propLower === 'cookie');
        if (gHeadersToReplace.includes(propLower)) {
          xhr.setRequestHeader(gDummyHeaderPrefix + propLower, d.headers[prop]);
        }
        else {
          xhr.setRequestHeader(prop, d.headers[prop]);
        }
      }
    }
  }

  // If this is a same-origin XHR or the user opted in with withCredentials,
  // add cookies unless already specified by the user.
  chrome.cookies.getAll({url: d.url}, cookies => {
    if (cookies.length && !hasCookieHeader
        && (d.withCredentials || isSameOrigin(tabUrl, d.url))
    ) {
      let cookieStrings = [];
      for (let cookie of cookies) {
        cookieStrings.push(cookie.name + '=' + cookie.value + ';');
      }
      xhr.setRequestHeader(gDummyHeaderPrefix + 'cookie', cookieStrings.join(' '));
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
  });
}


function isSameOrigin(first, second) {
  let firstUrl, secondUrl;
  try {
    firstUrl = new URL(first);
    secondUrl = new URL(second);
  } catch (e) {
    return false;
  }
  return firstUrl.origin === secondUrl.origin;
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


function rewriteHeaders(e) {
  if (e.originUrl && e.originUrl.startsWith(gExtensionUrl)) {
    for (var name of gHeadersToReplace) {
      var prefixedHeader = getHeader(e.requestHeaders, gDummyHeaderPrefix + name);
      if (prefixedHeader) {
        var unprefixedHeader = getHeader(e.requestHeaders, name);
        if (unprefixedHeader) {
          e.requestHeaders.splice(e.requestHeaders.indexOf(unprefixedHeader), 1);
        }
        e.requestHeaders.push({name: name, value: prefixedHeader.value});
        e.requestHeaders.splice(e.requestHeaders.indexOf(prefixedHeader), 1);
      }
    }
  }
  return {'requestHeaders': e.requestHeaders};
}
chrome.webRequest.onBeforeSendHeaders.addListener(
    rewriteHeaders,
    {'urls': ['<all_urls>'], 'types': ['xmlhttprequest']},
    ['blocking', 'requestHeaders']);

})();
