(function() {
const wantToShowUrl
    = 'https://www.greasespot.net/2017/09/greasemonkey-4-announcement.html';

browser.storage.local.get('previousWelcomeUrl').then(items => {
  let previousWelcomeUrl = items.previousWelcomeUrl;
  if (previousWelcomeUrl != wantToShowUrl) {
    browser.storage.local.set({ 'previousWelcomeUrl': wantToShowUrl, })
    .then(browser.tabs.create({ 'url': wantToShowUrl }))
    .catch(error => console.warn('Could not set previousWelcomeUrl.', error));
  }
});

})();
