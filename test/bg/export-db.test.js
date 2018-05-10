'use strict';
describe('bg/export-db', () => {
  function assertZipHasFileNamed(zip, name) {
    assert.isNotNull(
        zip.file(name),
        'Expected "' + name + '" among '
            + zip.file(/.*/).map(f => f.name).join(', '));
  }

  it('escapes special characters', async () => {
    let stubScript = new EditableUserScript({
      'name': 'name with/slash and:colon in',
      'content': '// Stub.',
      'downloadUrl': null,
    });
    let zip = await _createExportZip([stubScript]);

    assertZipHasFileNamed(zip, 'name with--slash and--colon in/.gm.json');
  });

  it('handles non-downloaded scripts', async () => {
    let stubScript = new EditableUserScript({
      'name': 'Unnamed Script 876720',
      'content': '// Stub.',
      'downloadUrl': null,
    });

    let zip = await _createExportZip([stubScript]);
    let file = zip.file(
        'Unnamed Script 876720/Unnamed Script 876720.user.js');

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

    let file = zip.file('script/.files.json');
    let urlMap = JSON.parse(await file.async('text'));

    assert.equal(urlMap['folder1/anything.js'], 'script/anything.js');
    assert.equal(urlMap['folder2/anything.js'], 'script/anything.2.js');
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

    assertZipHasFileNamed(zip, 'script/anything.js');
    assertZipHasFileNamed(zip, 'script/anything.2.js');
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

    assertZipHasFileNamed(zip, 'script/a.css');
    assertZipHasFileNamed(zip, 'script/a.2.css');
  });

  it('mangles identically named scripts', async () => {
    let stubScript = new EditableUserScript({
      'name': 'just-a-script',
      'content': '// Stub.',
      'downloadUrl': null,
    });

    let zip = await _createExportZip([stubScript, stubScript]);

    assertZipHasFileNamed(zip, 'just-a-script/.gm.json');
    assertZipHasFileNamed(zip, 'just-a-script.2/.gm.json');
  });

  it('stores enabled state', async () => {
    let stubScript = new EditableUserScript({
      'name': 'script',
      'content': '// Stub.',
      'downloadUrl': 'http://example.com/script.user.js',
    });

    {
      let zip = await _createExportZip([stubScript]);
      let file = zip.file('script/.gm.json');
      let state = JSON.parse(await file.async('text'));
      assert.isTrue(state.enabled);
    }

    stubScript.enabled = false;

    {
      let zip = await _createExportZip([stubScript]);
      let file = zip.file('script/.gm.json');
      let state = JSON.parse(await file.async('text'));
      assert.isFalse(state.enabled);
    }
  });
});
