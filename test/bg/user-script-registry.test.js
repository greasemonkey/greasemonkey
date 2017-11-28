describe('bg/user-script-registry', () => {
  beforeEach(() => {
    indexedDB.deleteDatabase('greasemonkey');
  });

  function scriptNamed(name) {
    for (let userScript of UserScriptRegistry.scriptsToRunAt()) {
      if (userScript.name === name) return userScript;
    }
  }

  it('can save and load a script', async () => {
    let userScript = new EditableUserScript(
        {'name': 'footnote', 'content': 'void(0)'});
    assert.isNotOk(scriptNamed('footnote'));
    await UserScriptRegistry._saveUserScript(userScript);
    assert.isOk(scriptNamed('footnote'));
    UserScriptRegistry._loadUserScripts();
    assert.isOk(scriptNamed('footnote'));
  });

  it('can uninstall a script', (done) => {
    let userScript = new EditableUserScript(
        {'name': 'exponential', 'content': 'void(0)'});
    assert.isNotOk(scriptNamed('exponential'));
    UserScriptRegistry._saveUserScript(userScript).then(() => {
      assert.isOk(scriptNamed('exponential'));
      onUserScriptUninstall({'uuid': userScript.uuid}, null, () => {
        assert.isNotOk(scriptNamed('exponential'));
        done();
      });
    });
  });

  it('match pattern respects query string', async () => {
    let userScriptWithQuery = new EditableUserScript(
        {'name': 'highlight',
         'matches': ['https://example.com/test?query=*'],
         'content': 'void(0)'});
    await UserScriptRegistry._saveUserScript(userScriptWithQuery);
    let userScriptNoQuery = new EditableUserScript(
        {'name': 'lowlight',
         'matches': ['https://example.com/test'],
         'content': 'void(0)'});
    await UserScriptRegistry._saveUserScript(userScriptNoQuery);
    let scriptsToRunWithQuery = Array.from(
      UserScriptRegistry.scriptsToRunAt(
        'https://example.com/test?query=something'));
    assert.equal(scriptsToRunWithQuery.length, 1);
    assert.equal(scriptsToRunWithQuery[0].name, userScriptWithQuery.name);
    let scriptsToRunNoQuery = Array.from(
      UserScriptRegistry.scriptsToRunAt(
        'https://example.com/test'));
    assert.equal(scriptsToRunNoQuery.length, 1);
    assert.equal(scriptsToRunNoQuery[0].name, userScriptNoQuery.name);
  });
});
