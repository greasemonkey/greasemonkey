'use strict';
describe('content/import', () => {
  function countOfMessagesNamed(messageName) {
    let count = 0;
    for (let call of chrome.runtime.sendMessage.getCalls()) {
      if (messageName == call.args[0].name) {
        count++;
      }
    }
    return count;
  }

  beforeEach(() => {
    chrome.runtime.sendMessage.reset();
    chrome.runtime.sendMessage.callsArg(1);

    // TODO: Inject, don't monkey-patch.  Until then, start with defaults.
    gImportOptions.remove = false;
    gImportOptions.replace = true;
  });

  it('does nothing with an empty ZIP', async () => {
    let zip = new JSZip();

    await importAllScriptsFromZip(zip, new Set());

    assert.equal(countOfMessagesNamed('UserScriptInstall'), 0);
  });

  it('uninstalls, with an empty ZIP and remove==true', async () => {
    let zip = new JSZip();

    // TODO: Inject, don't monkey-patch.
    gImportOptions.remove = true;

    await importAllScriptsFromZip(
        zip, {'null/is-installed': 'a46daf5d-2e5e-49a9-a0b9-bdf6056f9f2e'});

    assert.equal(countOfMessagesNamed('UserScriptUninstall'), 1);
  });

  it('does not install when replace==false', async () => {
    let zip = new JSZip();
    zip.file('already-installed.user.js', '// Stub.');

    // TODO: Inject, don't monkey-patch.
    gImportOptions.replace = false;

    await importAllScriptsFromZip(zip, new Set(['null/already-installed']));

    assert.equal(countOfMessagesNamed('UserScriptInstall'), 0);
  });

  it('installs a bare script file', async () => {
    let zip = new JSZip();
    zip.file('bare.user.js', '// Stub.');

    await importAllScriptsFromZip(zip, new Set());

    assert.equal(countOfMessagesNamed('UserScriptInstall'), 1);
  });

  it('installs a rich script export', async () => {
    let zip = new JSZip();
    zip.file('any/any.user.js', '// Stub.');
    zip.file('any/.gm.json', '{"enabled": true}');

    await importAllScriptsFromZip(zip, new Set());

    assert.equal(countOfMessagesNamed('UserScriptInstall'), 1);
    for (let call of chrome.runtime.sendMessage.getCalls()) {
      if ('UserScriptInstall' == call.args[0].name) {
        let message = call.args[0];
        assert.isTrue(message.userScript.enabled);
        break;
      }
    }
  });

  it('installs a script in disabled state', async () => {
    let zip = new JSZip();
    zip.file('any/any.user.js', '// Stub.');
    zip.file('any/.gm.json', '{"enabled": false}');

    await importAllScriptsFromZip(zip, new Set());

    assert.equal(countOfMessagesNamed('UserScriptInstall'), 1);
    for (let call of chrome.runtime.sendMessage.getCalls()) {
      if ('UserScriptInstall' == call.args[0].name) {
        let message = call.args[0];
        assert.isFalse(message.userScript.enabled);
        break;
      }
    }
  });
});
