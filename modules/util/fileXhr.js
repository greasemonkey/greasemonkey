'use strict';

var EXPORTED_SYMBOLS = ['fileXhr'];

Components.utils.importGlobalProperties(["XMLHttpRequest"]);

// Sync XHR.  It's just meant to fetch file:// URLs that aren't otherwise
// accessible in content.  Don't use it in the parent process or for web URLs.
function fileXhr(aUrl, aMimetype, aResponseType) {
  if (!aUrl.match(/^file:\/\//)) {
    throw new Error('fileXhr() used for non-file URL: ' + aUrl + '\n');
  }
  var xhr = new XMLHttpRequest();
  xhr.timeout = 5000;
  xhr.open("open", aUrl, false);
  if (aResponseType) {
    xhr.responseType = aResponseType;
  } else {
    xhr.overrideMimeType(aMimetype);
  }
  xhr.send(null);
  return aResponseType ? xhr.response : xhr.responseText;
}
