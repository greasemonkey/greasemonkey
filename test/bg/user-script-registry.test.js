describe('user-script-registry', () => {
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
});
