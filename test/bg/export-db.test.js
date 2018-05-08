'use strict';
describe('bg/export-db', () => {
  it('handles non-downloaded scripts', async () => {
    let stubScript = new EditableUserScript({
      'name': 'Unnamed Script 876720',
      'content': '// Stub.',
      'downloadUrl': null,
    });

    let zip = await _createExportZip([stubScript]);
    let file = zip.file(
        '000_Unnamed Script 876720/Unnamed Script 876720.user.js');
    assert.equal('// Stub.', await file.async('text'));
  });

  it('exposes url-to-filename mappings', async () => {
    let stubScript = new EditableUserScript({
      'name': 'script',
      'content': '// Stub.',
      'description': 'I have two `@require`s with the same base file name!',
      'downloadUrl': 'http://example.com/script.user.js',
      'requiresContent': {
        'folder1/anything.js': '// Stub.',
        'folder2/anything.js': '// Stub.',
      }
    });

    let zip = await _createExportZip([stubScript]);

    let file = zip.file('000_script/.files.json');
    let urlMap = JSON.parse(await file.async('text'));

    assert.equal(urlMap['folder1/anything.js'], '000_script/anything.js');
    assert.equal(urlMap['folder2/anything.js'], '000_script/anything.2.js');
  });

  it('mangles identically named @requires', async () => {
    let stubScript = new EditableUserScript({
      'name': 'script',
      'content': '// Stub.',
      'description': 'I have two `@require`s with the same base file name!',
      'downloadUrl': 'http://example.com/script.user.js',
      'requiresContent': {
        'folder1/anything.js': '// Stub.',
        'folder2/anything.js': '// Stub.',
      }
    });

    let zip = await _createExportZip([stubScript]);

    let zipFileNames = zip.file(/.*/).map(f => f.name);
    assert.isTrue(
        zipFileNames.includes('000_script/anything.js'),
        'expect zip to contain file named: 000_script/anything.js');
    assert.isTrue(
        zipFileNames.includes('000_script/anything.2.js'),
        'expect zip to contain file named: 000_script/anything.2.js');
    assert.isFalse(
        zipFileNames.includes('000_script/anythingelse.js'),
        'expect zip to NOT contain file named: 000_script/anythingelse.js');
  });

  it('mangles identically named @resources', async () => {
    let stubScript = new EditableUserScript({
      'name': 'script',
      'content': metaBlockFromLines(
          '// @resource a folder1/a.css',
          '// @resource b folder2/a.css'),
      'description': 'I have two `@resources`s with the same name!',
      'downloadUrl': 'http://example.com/script.user.js',
      'resources': {
        'a': {'name': 'a', 'mimetype': 'text/plain', 'blob': new Blob(['stub'])},
        'b': {'name': 'b', 'mimetype': 'text/plain', 'blob': new Blob(['stub'])},
      }
    });

    let zip = await _createExportZip([stubScript]);

    let zipFileNames = zip.file(/.*/).map(f => f.name);
    assert.include(zipFileNames, '000_script/a.css');
    assert.include(zipFileNames, '000_script/a.2.css');
  });

  it('stores enabled state', async () => {
    let stubScript = new EditableUserScript({
      'name': 'script',
      'content': '// Stub.',
      'downloadUrl': 'http://example.com/script.user.js',
    });

    {
      let zip = await _createExportZip([stubScript]);
      let file = zip.file('000_script/.gm.json');
      let state = JSON.parse(await file.async('text'));
      assert.isTrue(state.enabled);
    }

    stubScript.enabled = false;

    {
      let zip = await _createExportZip([stubScript]);
      let file = zip.file('000_script/.gm.json');
      let state = JSON.parse(await file.async('text'));
      assert.isFalse(state.enabled);
    }
  });
});
