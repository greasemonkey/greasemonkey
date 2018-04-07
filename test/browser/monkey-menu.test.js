'use strict';
describe('browser/monkey-menu', () => {
  it('creates a tab for openUserScriptEditor()', () => {
    chrome.tabs.create.reset();
    openUserScriptEditor('fake-uuid');
    assert(chrome.tabs.create.calledOnce);
  });
});
