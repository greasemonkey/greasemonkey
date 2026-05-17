'use strict';
/* Detect user scripts, possibly open the installation dialog. */

window.initrc.startAdd(async function() {

const gContentTypeRe = (() => {
  const userScriptTypes = [
      'text/plain',
      'application/ecmascript',
      'application/javascript',
      'application/x-javascript',
      'text/ecmascript',
      'text/javascript',
      ];
  return new RegExp(`^(${userScriptTypes.join('|')})\\b`);
})();


function onHeadersReceivedDetectUserScript(requestDetails_) {
  const requestDetails = requestDetails_;
  if (false === window.options_ready)
    return setTimeout(function(){
       onHeadersReceivedDetectUserScript(requestDetails);
    },10);
  if (!getGlobalEnabled()) return {};
  if (requestDetails.method != 'GET') return {};
  if (!responseHasUserScriptType(requestDetails.responseHeaders)) return {};

  openInstallDialog(requestDetails.url);

  return {'cancel': true};
}
window.onHeadersReceivedDetectUserScript = onHeadersReceivedDetectUserScript;


function responseHasUserScriptType(responseHeaders) {
  for (let header of responseHeaders) {
    let headerName = header.name.toLowerCase();
    if ('content-type' === headerName && gContentTypeRe.test(header.value)) {
      return true;
    }
  }
  return false;
}


function openInstallDialog(url) {
  chrome.runtime.getPlatformInfo(platform => {
   let installUrl = chrome.runtime.getURL('src/content/install-dialog.html')
       + '?' + escape(url);

   if ('android' === platform.os) {
     chrome.tabs.create({'active': true, 'url': installUrl});
   } else {
     let options = {
       'height': 640,
       'type': 'popup',
       'url': installUrl,
       'width': 480,
     };
     chrome.windows.create(options, newWindow => {
       // Fix for Fx57 bug where bundled page loaded using
       // browser.windows.create won't show contents unless resized.
       // See https://bugzilla.mozilla.org/show_bug.cgi?id=1402110
       chrome.windows.update(newWindow.id, {width: newWindow.width + 1});
     });
   }
  });
}

}, 2);
