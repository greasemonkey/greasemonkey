describe('bg/on-user-script-menu-command', () => {
  function createFakePortAndConnect({tabId, postMessage = () => {}}) {
    const ChromeEvent = chrome.runtime.onMessage.constructor;

    const fakePort = {
      name: 'UserScriptMenuCommand',
      sender: {
        tab: {
          id: tabId,
        },
      },
      onMessage: new ChromeEvent(),
      onDisconnect: new ChromeEvent(),
      postMessage,
    };
    chrome.runtime.onConnect.trigger(fakePort);
    return fakePort;
  }

  function sendMessage(msg) {
    return new Promise(resolve => {
      chrome.runtime.onMessage.trigger(
          msg,
          {url: chrome.runtime.getURL('browser/monkey-menu.html')},
          resolve);
    });
  }

  before(() => {
    sinon.stub(UserScriptRegistry, 'scriptByUuid').returns(
        {grants: 'GM.registerMenuCommand'});
  });

  after(() => {
    UserScriptRegistry.scriptByUuid.restore();
  });

  describe('single command', () => {
    const testData = {
      'can register a command without an accessKey': {
        caption: 'Button text',
        accessKey: '',
      },
      'can register a command with an uppercase accessKey': {
        caption: 'Button text',
        accessKey: 'A',
      },
      'can register a command with a lowercase accessKey': {
        caption: 'Button text',
        accessKey: 'b',
      },
      'can register a command with a supplementary character accessKey': {
        caption: 'Button text',
        accessKey: '🐒',
      },
    };

    for (const title in testData) {
      it(title, async () => {
        const details = testData[title];

        const fakePort = createFakePortAndConnect({tabId: 1});
        fakePort.onMessage.trigger({
          name: 'register',
          details: details,
        }, fakePort);

        const commands = await sendMessage(
            {name: 'ListMenuCommands', tabId: 1});

        fakePort.onDisconnect.trigger();

        assert.equal(commands.length, 1);
        assert.include(commands[0], details);
      });
    }

    it('can click a registered command', async () => {
      const details = {
        caption: 'Button text',
        accessKey: '',
      };

      const postMessage = sinon.stub();
      const fakePort = createFakePortAndConnect({tabId: 1, postMessage});
      fakePort.onMessage.trigger({
        name: 'register',
        details,
      }, fakePort);

      const commands = await sendMessage({name: 'ListMenuCommands', tabId: 1});

      sendMessage({name: 'MenuCommandClick', id: commands[0].id});

      fakePort.onDisconnect.trigger();

      assert.isOk(postMessage.withArgs(
          sinon.match({type: 'onclick'})).calledOnce);
    });

    it('a random generated command "id" is a valid HTML/XML ID', async () => {
      const fakePort = createFakePortAndConnect({tabId: 1});
      fakePort.onMessage.trigger({
        name: 'register',
        details: {
          caption: 'Button text',
          accessKey: '',
        },
      }, fakePort);

      const commands = await sendMessage({name: 'ListMenuCommands', tabId: 1});

      fakePort.onDisconnect.trigger();

      assert.notMatch(commands[0].id, /^[-.0-9]/);
    });
  });

  describe('multiple commands', async () => {
    it('can register multiple commands related with one tab', async () => {
      const detailsList = [
        {caption: 'A', accessKey: ''},
        {caption: 'B', accessKey: 'b'},
      ];

      const fakePorts = detailsList.map(details => {
        const fakePort = createFakePortAndConnect({tabId: 1})
        fakePort.onMessage.trigger({
          name: 'register',
          details,
        }, fakePort);
        return fakePort;
      });

      const commands = await sendMessage({name: 'ListMenuCommands', tabId: 1});

      for (const fakePort of fakePorts) {
        fakePort.onDisconnect.trigger();
      }

      assert.equal(commands.length, detailsList.length);
      for (const {command, details} of commands
          .sort((a, b) => a.caption < b.caption ? -1 : 1)
          .map((command, i) => ({command, details: detailsList[i]}))) {
        assert.include(command, details);
      }
    });

    it('can register multiple commands related with multiple tab', async () => {
      const detailsList1 = [
        {caption: 'A', accessKey: ''},
        {caption: 'B', accessKey: 'b'},
      ];

      const detailsList2 = [
        {caption: 'C', accessKey: ''},
        {caption: 'D', accessKey: 'd'},
      ];

      const fakePorts = detailsList1.map(details => {
        const fakePort = createFakePortAndConnect({tabId: 1})
        fakePort.onMessage.trigger({
          name: 'register',
          details,
        }, fakePort);
        return fakePort;
      }).concat(detailsList2.map(details => {
        const fakePort = createFakePortAndConnect({tabId: 2})
        fakePort.onMessage.trigger({
          name: 'register',
          details,
        }, fakePort);
        return fakePort;
      }));

      const commands1 = await sendMessage({name: 'ListMenuCommands', tabId: 1});
      const commands2 = await sendMessage({name: 'ListMenuCommands', tabId: 2});

      for (const fakePort of fakePorts) {
        fakePort.onDisconnect.trigger();
      }

      assert.equal(commands1.length, detailsList1.length);
      for (const {command, details} of commands1
          .sort((a, b) => a.caption < b.caption ? -1 : 1)
          .map((c, i) => ({'command': c, details: detailsList1[i]}))) {
        assert.include(command, details);
      }

      assert.equal(commands2.length, detailsList2.length);
      for (const {command, details} of commands2
          .sort((a, b) => a.caption < b.caption ? -1 : 1)
          .map((c, i) => ({'command': c, details: detailsList2[i]}))) {
        assert.include(command, details);
      }
    });
  });

  describe('bad parameters', () => {
    before(() => {
      sinon.stub(console, 'warn');
    });

    after(() => {
      console.warn.restore();
    });

    it('warn when invalid message name is sent', () => {
      const fakePort = createFakePortAndConnect({tabId: 1});
      fakePort.onMessage.trigger({
        name: 'fakeName',
      }, fakePort);

      assert.isOk(console.warn.calledOnce);
    });

    it('throws TypeError when message is not an object', () => {
      const fakePort = createFakePortAndConnect({tabId: 1});

      expect(() => fakePort.onMessage.trigger(null, fakePort))
          .to.throw(TypeError);
    });
  });
});
