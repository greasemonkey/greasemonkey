'use strict';
describe('bg/api-provider-source', () => {
  for (let apiName of SUPPORTED_APIS) {
    it('handles ' + apiName, () => {
      let source = apiProviderSource({'grants': [apiName]});
      assert(source.match(new RegExp(apiName + ' = ')));
    });
  }

  it('handles grant none', () => {
    let source = apiProviderSource({'grants': ['none']});
    assert(source.match(/No grants/));
  });

  it('handles no grants', () => {
    let source = apiProviderSource({'grants': []});
    assert(source.match(/No grants/));
  });

  function createFakePort({name = '', postMessage = () => {}}) {
    const ChromeEvent = chrome.runtime.onMessage.constructor;

    return {
      name,
      onMessage: new ChromeEvent(),
      postMessage,
    };
  }

  function getApi({apiName}) {
    const GM = {};
    eval(apiProviderSource({grants: [apiName]}));
    return GM[apiName.split('.')[1]];
  }

  describe('GM.registerMenuCommand()', () => {
    afterEach(() => chrome.runtime.connect.flush());

    const testData = {
      'throws Error when commandFunc is not a function': {
        argumentList: ['Button text', {handleEvent: () => {}}],
        expectedException: [Error, 'gm_rmc_bad_command_func'],
      },
      'throws Error when accessKey is not a string': {
        argumentList: ['Button text', () => {}, new String('a')],
        expectedException: [Error, 'gm_rmc_bad_access_key'],
      },
      'throws Error when accessKey is not a single character': {
        argumentList: ['Button text', () => {}, 'ab'],
        expectedException: [Error, 'gm_rmc_bad_access_key'],
      },
      'can register a command without an accessKey': {
        argumentList: ['Button text', () => {}],
        expectedMessage: {
          name: 'register',
          details: {
            caption: 'Button text',
            accessKey: '',
          }
        },
      },
      'can register a command with an uppercase accessKey': {
        argumentList: ['Button text', () => {}, 'A'],
        expectedMessage: {
          name: 'register',
          details: {
            caption: 'Button text',
            accessKey: 'A',
          }
        },
      },
      'can register a command with a lowercase accessKey': {
        argumentList: ['Button text', () => {}, 'b'],
        expectedMessage: {
          name: 'register',
          details: {
            caption: 'Button text',
            accessKey: 'b',
          }
        },
      },
      'can register a command with a supplementary character accessKey': {
        argumentList: ['Button text', () => {}, '🐒'],
        expectedMessage: {
          name: 'register',
          details: {
            caption: 'Button text',
            accessKey: '🐒',
          }
        },
      },
      'can register a command with non string caption': {
        argumentList: [new URL('example://'), () => {}],
        expectedMessage: {
          name: 'register',
          details: {
            caption: 'example://',
            accessKey: '',
          }
        },
      },
    };

    for (const title in testData) {
      it(title, () => {
        const postMessage = sinon.stub();
        const fakePort = createFakePort({postMessage});
        chrome.runtime.connect.returns(fakePort);

        const registerMenuCommand = getApi({apiName: 'GM.registerMenuCommand'});

        if (testData[title]['expectedException']) {
          expect(() => registerMenuCommand(...testData[title].argumentList))
              .to.throw(...testData[title]['expectedException']);
        } else {
          registerMenuCommand(...testData[title].argumentList);
          assert.isOk(postMessage.withArgs(sinon.match(
              testData[title].expectedMessage)).calledOnce);
        }
      });
    }

    it('can click a registered command', () => {
      const fakePort = createFakePort({});
      chrome.runtime.connect.returns(fakePort);

      const commandFunc = sinon.stub();
      const registerMenuCommand = getApi({apiName: 'GM.registerMenuCommand'});
      registerMenuCommand('Button text', commandFunc);

      fakePort.onMessage.trigger({type: 'onclick'});

      assert.isOk(commandFunc.calledOnce);
    });
  });
});
