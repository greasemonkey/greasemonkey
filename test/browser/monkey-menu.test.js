'use strict';
describe('browser/monkey-menu', () => {
  it('has no syntax errors in activate()', () => {
    activate(document.createElement('div'));
  });

  it('has no syntax errors in loadScripts() and '
      + 'toggleUserScriptEnabled() and uninstall()', () => {
    loadScripts(
        [{'name': 'binary', 'uuid': 'fake-uuid'}],
        new URL('http://example.com/'));

    chrome.runtime.sendMessage.callsArgWith(1, {'enabled': true});
    toggleUserScriptEnabled('fake-uuid');

    chrome.runtime.sendMessage.callsArg(1);
    uninstall('fake-uuid')
  });

  it('creates a tab for openUserScriptEditor()', () => {
    chrome.tabs.create.reset();
    openUserScriptEditor('fake-uuid');
    assert(chrome.tabs.create.calledOnce);
  });

  describe('addOriginGlobTo', () => {
    gTplData.originGlob = 'http://example.org/*';

    it('should gracefully add to an empty string', () => {
      let result = addOriginGlobTo('');
      assert.equal(result, gTplData.originGlob);
    });

    it('should add to an existing string', () => {
      let result = addOriginGlobTo('http://example.net/admin/*\n\n');
      assert.equal(result, 'http://example.net/admin/*\nhttp://example.org/*');
    });
  });
});
