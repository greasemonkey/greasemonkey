'use strict';
window.initrc.startAdd(async function() {
chrome.webRequest.onHeadersReceived.addListener(
    onHeadersReceivedDetectUserScript,
    {'urls': ['*://*/*.user.js'], 'types': ['main_frame']},
    ['blocking', 'responseHeaders']);
}, 2);
