'use strict';

var EXPORTED_SYMBOLS = ['fileXHR'];

Components.utils.importGlobalProperties(["XMLHttpRequest"]);

// sync XHR. it's just meant to fetch file:// uris that aren't otherwise accessible in content
// don't use it in the parent process or for web URLs
function fileXHR(uri, mimetype) {
  var xhr = new XMLHttpRequest();
  xhr.open("open", uri, false);
  xhr.overrideMimeType(mimetype);
  xhr.send(null);  
  return xhr.responseText;
}