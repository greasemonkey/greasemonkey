'use strict';
(function() {
const wantToShowUrl
    = 'https://www.greasespot.net/2017/09/greasemonkey-4-announcement.html';

chrome.storage.local.get('previousWelcomeUrl', items => {
  let previousWelcomeUrl = items.previousWelcomeUrl;
  if (previousWelcomeUrl != wantToShowUrl) {
    chrome.storage.local.set({'previousWelcomeUrl': wantToShowUrl,}, () => {
      if (chrome.runtime.lastError) {
        console.warn(
          'Could not set previousWelcomeUrl.', chrome.runtime.lastError);
        return;
      }
      chrome.tabs.create({'url': wantToShowUrl});
    });
  }
});

})();
