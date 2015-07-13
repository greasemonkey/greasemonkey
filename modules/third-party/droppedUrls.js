/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ['droppedUrls'];

function droppedUrls(aEvent) {
  var dataTransfer = aEvent.dataTransfer;
  var urls = [];

  // Convert every dropped item into a url
  for (var i = 0; i < dataTransfer.mozItemCount; i++) {
    var url = dataTransfer.mozGetDataAt('text/uri-list', i);
    if (url) {
      urls.push(url);
      continue;
    }

    url = dataTransfer.mozGetDataAt('text/x-moz-url', i);
    if (url) {
      urls.push(url.split('\n')[0]);
      continue;
    }

    var file = dataTransfer.mozGetDataAt('application/x-moz-file', i);
    if (file) {
      urls.push(Services.io.newFileURI(file).spec);
      continue;
    }
  }

  return urls;
}
