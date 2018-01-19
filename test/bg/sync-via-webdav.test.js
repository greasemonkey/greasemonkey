/**
 * @typedef {object} WebDAV
 * @property {import('../../third-party/webdav/index').createClient} createClient
 */

describe('bg/sync-via-webdav', () => {
  const WEBDAV_ROOT_DIRECTORY_URL = new URL('/webdav/', location).href;

  const fakeStorage = {};
  /** @type {import('../../third-party/webdav/index').WebDAVClient} */
  let webdavClient;

  before(async () => {
    chrome.storage.local.set.callsFake((keys, callback) => {
      Object.assign(fakeStorage, keys);
      callback();
    });

    chrome.storage.local.get.callsFake((keys, callback) => {
      callback(Object.assign(keys, fakeStorage));
    });
  });

  after(() => {
    chrome.storage.local.set.flush();
    chrome.storage.local.get.flush();
  });

  beforeEach(async () => {
    webdavClient = WebDAV.createClient(WEBDAV_ROOT_DIRECTORY_URL);
    await webdavClient.createDirectory('/');
  });

  afterEach(async () => {
    if (setTimeout.restore) {
      setTimeout.restore();
    }
    if (console.error.restore) {
      console.error.restore();
    }
    chrome.notifications.create.flush();
    chrome.notifications.clear.flush();

    await onSyncViaWebdavChangeOption({'enabled': false}, {}, () => {});

    for (const key of Object.keys(fakeStorage)) {
      delete fakeStorage[key];
    }

    await webdavClient.deleteFile('/');
  });

  const NAMESPACE = 'https://github.com/greasemonkey/greasemonkey/issues/2513';
  async function addUserScript({name, namespace = NAMESPACE, uuid = null}) {
    const script = new EditableUserScript({name, namespace, uuid, 'content': `// ==UserScript==
// @name        ${name}
// @namespace   ${NAMESPACE}
// ==/UserScript==`});
    await UserScriptRegistry.saveUserScript(script);
    return script;
  }

  it('initialization succeeds', async () => {
    const scripts = [
      {
        'name': '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~',
        'filename': '!＂＃$%&\'()＊+,-.／：;＜=＞？@[＼]^_`{｜}~',
      },
      {
        'name': '　  leading white space',
        'filename': 'leading white space',
      },
      {
        'name': '.leading full stop',
        'filename': '．leading full stop',
      },
      {
        'name': '🐒'.repeat(256),
        'directoryName': '🐒'.repeat(255 - ' (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)'.length),
        'filename': '🐒'.repeat(255 - '.user.js'.length),
      },
      {
        'name': 'aux',
        'filename': 'aux',
      },
      {
        'name': 'aux 　.',
        'filename': 'aux 　．',
      },
    ];

    for (const script of scripts) {
      const userScript = await addUserScript({'name': script.name});
      Object.assign(script, {'uuid': userScript.uuid, 'content': userScript.content});
      script.directoryName = `${script.directoryName || script.filename} (${script.uuid})`;
      script.filename += '.user.js';
    }
    const userScriptsCount = Array.from((await UserScriptRegistry.scriptsToRunAt(null, true))).length;
    assert.isAtLeast(userScriptsCount, scripts.length);

    fakeStorage.syncViaWebdav = {
      'enabled': true,
      'url': WEBDAV_ROOT_DIRECTORY_URL,
    };

    await SyncViaWebdav._run();

    /** @type {import('../../third-party/webdav/index').FileStat[]} */
    const itemStats = await webdavClient.getDirectoryContents('/', {'deep': true});

    assert.lengthOf(
        itemStats.filter(stat => stat.type === 'directory'),
        userScriptsCount,
        JSON.stringify(itemStats, null, 2));

    for (const script of scripts) {
      const directoryStat = itemStats.find(stat => stat.filename.endsWith(`(${script.uuid})`));
      assert.isOk(directoryStat, script.directoryName);
      assert.equal(directoryStat.basename, script.directoryName);
      const stat = itemStats.find(stat => stat.filename.includes(`(${script.uuid})/`))
      assert.isOk(stat, script.filename);
      assert.equal(stat.basename, script.filename);
      assert.equal(stat.filename, `/${script.directoryName}/${script.filename}`);
      assert.equal(await webdavClient.getFileContents(stat.filename, {'format': 'text'}), script.content);
    }
  });

  /**
   * @param {string} uuid
   * @returns {Promise.<?import('../../third-party/webdav/index').FileStat>}
   */
  async function getUserJsFileStat(uuid) {
    return (await webdavClient.getDirectoryContents('/', {'deep': true, 'glob': `/*\\(${uuid})/*.user.js`}))[0];
  }

  it('update an user script on Greasemonkey, then a local file will be updated', async () => {
    const script = await addUserScript({'name': 'Greasemonkey → File'});

    await onSyncViaWebdavChangeOption({'url': WEBDAV_ROOT_DIRECTORY_URL}, {}, () => {});
    await onSyncViaWebdavChangeOption({'enabled': true}, {}, () => {});

    const stat = await getUserJsFileStat(script.uuid);
    assert.isOk(stat);
    assert.equal(await webdavClient.getFileContents(stat.filename, {'format': 'text'}), script.content);

    const content = (await addUserScript({'name': 'Greasemonkey → File updated', 'uuid': script.uuid})).content;

    // Wait for sync to be completed.
    await new Promise(resolve => {
      setTimeout(resolve);
    });
    await onSyncViaWebdavChangeOption({}, {}, () => {});

    assert.equal(await webdavClient.getFileContents(stat.filename, {'format': 'text'}), content);
  });

  it('overwrite and save a local file, then an user script on Greasemonkey will be updated', async () => {
    const scripts = await Promise.all([
      'File → Greasemonkey (same last-modified)',
      'File → Greasemonkey (different last-modified)',
      'File → Greasemonkey (invalid URL)',
      'File → Greasemonkey (same name and namespace)',
      'File → Greasemonkey (same name and namespace) dummy',
    ].map(async name => {
      const script = await addUserScript({name});
      script.name = name;
      return script;
    }));
    const INVALID_URL = 'https://greasemonkey.invalid/lib.js';

    // Shorten DIRECTORY_MONITOR_INTERVAL to shorten the test time.
    const _setTimeout = setTimeout;
    sinon.stub(window, 'setTimeout').callsFake((handler, timeout = 0, ...args) => {
      _setTimeout(handler, 100, args);
    });

    // Wait for the milliseconds portion to reach zero.
    await new Promise(resolve => {
      _setTimeout(resolve, 1000 - new Date().getMilliseconds());
    });

    // Suppress console.error() in installFromDownloader().
    const error = console.error;
    sinon.stub(console, 'error').callsFake((...args) => {
      if (typeof args[0] === 'string' && args[0].includes('installFromDownloader')
        && typeof args[1] === 'string' && args[1].includes(NAMESPACE)) {
        return;
      }
      error(...args);
    });

    await onSyncViaWebdavChangeOption({'url': WEBDAV_ROOT_DIRECTORY_URL}, {}, () => {});
    await onSyncViaWebdavChangeOption({'enabled': true}, {}, () => {});

    const notificationOptionsList = [];
    chrome.notifications.create.callsFake((notificationId, options, callback = null) => {
      notificationOptionsList.push(options);
      if (callback) {
        callback('');
      }
    });
    chrome.notifications.clear.callsFake((notificationId, callback = null) => {
      if (callback) {
        callback(true);
      }
    });
    let expectedErrorCount = 0;

    for (const script of scripts) {
      script.fileStat = await getUserJsFileStat(script.uuid);
      assert.isOk(script.fileStat, script.name);

      assert.equal(
          await webdavClient.getFileContents(script.fileStat.filename, {'format': 'text'}),
          script.content,
          script.name);

      script.modifiedName = script.name.replace(' dummy', '') + ' updated';
      script.modifiedContent = script.content.replace(script.name, script.modifiedName);
      if (script.name.includes('invalid URL')) {
        script.modifiedContent = `// ==UserScript==
// @name        ${script.modifiedName}
// @namespace   ${NAMESPACE}
// @require     ${INVALID_URL}
// ==/UserScript==`;
      }

      if (!script.name.includes('different last-modified')) {
        await webdavClient.putFileContents(script.fileStat.filename, script.modifiedContent);
        if (script.name.includes('same last-modified')) {
          script.etag = (await getUserJsFileStat(script.uuid)).etag;
        }
        if (script.name.includes('invalid URL') || script.name.includes(' dummy')) {
          expectedErrorCount++;
        }
      }
    }

    // Wait until last-modified is different.
    await new Promise(resolve => {
      _setTimeout(resolve, 1000);
    });

    for (const script of scripts) {
      if (script.name.includes('different last-modified') || script.name.includes('invalid URL')) {
        await webdavClient.putFileContents(script.fileStat.filename, script.modifiedContent);
        if (script.name.includes('invalid URL')) {
          expectedErrorCount++;
        }
      }

      script.modifiedFileStat = await getUserJsFileStat(script.uuid);
      if (script.name.includes('same last-modified')) {
        assert.equal(script.modifiedFileStat.lastmod, script.fileStat.lastmod);
        // Check that writes are not looping.
        assert.equal(script.modifiedFileStat.etag, script.etag);
      } else if (script.name.includes('different last-modified')) {
        assert.notEqual(script.modifiedFileStat.lastmod, script.fileStat.lastmod);
      }
    }

    // Wait for sync to be completed.
    await new Promise(resolve => {
      _setTimeout(resolve, 500);
    });

    for (const script of scripts) {
      if (script.name.includes('same name')) {
        // Cannot determine which of the two scripts causes the error.
        continue;
      }
      const modifiedUserScript = UserScriptRegistry.scriptByUuid(script.uuid);
      const isErrorScript = script.name.includes('invalid URL');
      assert.equal(
          modifiedUserScript.content,
          isErrorScript ? script.content : script.modifiedContent,
          script.name);
      assert.equal(
          modifiedUserScript.name,
          isErrorScript ? script.name : script.modifiedName,
          script.name);
    }

    assert.equal(
        notificationOptionsList.length,
        expectedErrorCount,
        JSON.stringify(notificationOptionsList, null, 2));
    for (const options of notificationOptionsList) {
      if (options.message.includes('invalid URL')) {
        assert.include(options.message, INVALID_URL);
      } else if (options.message.includes('same name')) {
        assert.include(options.message, NAMESPACE);
      } else {
        return Promise.reject(new Error());
      }
    }
  }).timeout(3500);

  it('install new user script, then a local file will be created', async () => {
    await onSyncViaWebdavChangeOption({'enabled': true}, {}, () => {});
    await onSyncViaWebdavChangeOption({'url': WEBDAV_ROOT_DIRECTORY_URL}, {}, () => {});

    const script = await addUserScript({'name': 'Unnamed Script 100000'});

    // Wait for sync to be completed.
    await new Promise(resolve => {
      setTimeout(resolve);
    });
    await onSyncViaWebdavChangeOption({}, {}, () => {});

    const stat = await getUserJsFileStat(script.uuid);
    assert.isOk(stat);
    assert.equal(await webdavClient.getFileContents(stat.filename, {'format': 'text'}), script.content);
  });

  it('uninstall an user script, then a local file will be removed', async () => {
    const script = await addUserScript({'name': 'Unnamed Script 1000000'});

    await onSyncViaWebdavChangeOption({'enabled': true}, {}, () => {});
    await onSyncViaWebdavChangeOption({'url': WEBDAV_ROOT_DIRECTORY_URL}, {}, () => {});

    const stat = await getUserJsFileStat(script.uuid);
    assert.isOk(stat);
    assert.equal(await webdavClient.getFileContents(stat.filename, {'format': 'text'}), script.content);

    await onUserScriptUninstall(script, {}, () => {});

    // Wait for sync to be completed.
    await new Promise(resolve => {
      setTimeout(resolve);
    });
    await onSyncViaWebdavChangeOption({}, {}, () => {});

    assert.isNotOk(await getUserJsFileStat(script.uuid));
  });
});
