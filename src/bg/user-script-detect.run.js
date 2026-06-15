'use strict';
chrome.webRequest.onHeadersReceived.addListener(
    onHeadersReceivedDetectUserScript,
    {'urls': ['*://*/*.user.js', '*://*/*.user.js?*'], 'types': ['main_frame']},
    ['blocking', 'responseHeaders']);
