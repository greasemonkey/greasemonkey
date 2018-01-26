browser.webRequest.onHeadersReceived.addListener(
  detectUserScriptOnHeadersReceived,
  {'urls': ['*://*/*.user.js'], 'types': ['main_frame']},
  ['blocking', 'responseHeaders']
);
