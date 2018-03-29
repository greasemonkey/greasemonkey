'use strict';
chrome.webRequest.onHeadersReceived.addListener(
    onHeadersReceivedDetectUserScript,
    {'urls': ['*://*/*.user.js'], 'types': ['main_frame']},
    ['blocking', 'responseHeaders']);
