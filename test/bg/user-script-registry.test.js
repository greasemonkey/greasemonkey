'use strict';
describe('bg/user-script-registry', () => {
  afterEach((done) => {
    let req = indexedDB.deleteDatabase('greasemonkey');
    req.onsuccess = () => done();
    req.onerror = event => {
      console.error('delete error;', event, event.result);
    };
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
    await UserScriptRegistry._loadUserScripts();
    assert.isOk(scriptNamed('footnote'));
  }).timeout(5000);

  it('fails when saving two scripts of the same name', async () => {
    let userScript1 = new EditableUserScript(
        {'name': 'conflict1', 'content': 'void(0)'});
    await UserScriptRegistry._saveUserScript(userScript1);
    assert.isOk(scriptNamed('conflict1'));

    let userScript2 = new EditableUserScript(
        {'name': 'conflict2', 'content': 'void(0)'});
    await UserScriptRegistry._saveUserScript(userScript2);
    assert.isOk(scriptNamed('conflict2'));

    let userScript2Clone = new EditableUserScript(userScript2.details);
    userScript2Clone._name = 'conflict1';

    return UserScriptRegistry._saveUserScript(userScript2Clone)
        .then(() => { throw new Error('Should not succeed here!') })
        .catch(e => chai.expect(e.name).to.equal('ConstraintError'));
  }).timeout(5000);

  it('can uninstall a script', async () => {
    let userScript = new EditableUserScript(
        {'name': 'exponential', 'content': 'void(0)'});
    assert.isNotOk(scriptNamed('exponential'));

    await UserScriptRegistry._saveUserScript(userScript);
    assert.isOk(scriptNamed('exponential'));
    await onUserScriptUninstall({'uuid': userScript.uuid}, null, null);
    assert.isNotOk(scriptNamed('exponential'));
  }).timeout(5000);
});
