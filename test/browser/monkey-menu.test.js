describe('monkey-menu', () => {
  it('has no syntax errors in goToTop()', () => {
    goToTop();
  });

  it('has no syntax errors in loadScripts()', () => {
    loadScripts([{'name': 'binary'}], new URL('http://example.com/'));
  });

  it('has no syntax errors in uninstall()', () => {
    chrome.runtime.sendMessage.callsArg(1);
    uninstall('fake-uuid')
  });

  it('creates a tab for openUserScriptEditor()', () => {
    chrome.tabs.create.reset();
    openUserScriptEditor('fake-uuid');
    assert(chrome.tabs.create.calledOnce);
  });
});
