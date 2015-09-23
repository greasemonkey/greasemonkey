'use strict';

var EXPORTED_SYMBOLS = ['fileXhr'];

Components.utils.importGlobalProperties(["XMLHttpRequest"]);

// Sync XHR.  It's just meant to fetch file:// URLs that aren't otherwise
// accessible in content.  Don't use it in the parent process or for web URLs.
function fileXhr(url, mimetype) {
  if (!url.match(/^file:\/\//)) {
    throw new Error('fileXhr() used for non-file URL: ' + url + '\n');
  }
  var xhr = new XMLHttpRequest();
  xhr.open("open", url, false);
  xhr.overrideMimeType(mimetype);
  xhr.send(null);
  return xhr.responseText;
}
