/* Checks the functionality of on-message */

describe('bg/on-message.js', () => {
  // Wrap sendMessage so that that tests can look cleaner
  const sendMessage = (message, cb, remote) => {
    return () => {
      return chrome.runtime.sendMessage(message, cb, remote);
    }
  };

  it('blocks non API message from unknown sender', () => {
    let message = {
      'name': 'UserScriptToggleEnabled',
    };

    chai.expect(sendMessage(message, null, true), 'Permission denied not thrown')
      .to.throw('ERROR refusing to handle');
  });
});

