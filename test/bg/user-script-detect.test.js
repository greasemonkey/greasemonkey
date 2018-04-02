'use strict';
describe('bg/user-script-detect', () => {
  it('opens install dialog (on linux)', () => {
    chrome.windows.create.reset();
    chrome.runtime.getPlatformInfo.callsArgWith(
        0, {'os': 'linux', 'arch': 'x86-64'});

    onHeadersReceivedDetectUserScript({
      'method': 'GET',
      'responseHeaders': [
        {'name': 'Content-Type', 'value': 'text/plain'},
      ],
      'url': 'http://example.com/any-old-scrit.user.js',
    });

    assert(chrome.windows.create.calledOnce);
  });

  it('opens install dialog in a tab (on android)', () => {
    chrome.tabs.create.reset();
    chrome.runtime.getPlatformInfo.callsArgWith(
        0, {'os': 'android', 'arch': '???'});

    onHeadersReceivedDetectUserScript({
      'method': 'GET',
      'responseHeaders': [
        {'name': 'Content-Type', 'value': 'text/plain'},
        ],
        'url': 'http://example.com/any-old-scrit.user.js',
    });

    assert(chrome.tabs.create.calledOnce);
  });
});
