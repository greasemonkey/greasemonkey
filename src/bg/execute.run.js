chrome.webRequest.onResponseStarted.addListener(
  executeUserscriptOnResponseStarted,
  { 'urls': ['<all_urls>'], 'types': ['main_frame', 'sub_frame'] });
