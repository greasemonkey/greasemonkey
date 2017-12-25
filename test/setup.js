// user-script-obj.js looks up the extension version from the manifest
chrome.runtime.getManifest.returns({'version': 1});

// on-message uses getUrl to determine if a message is from an extension page
chrome.runtime.getURL.withArgs('').returns('gm-ext');
// all messages should pass through on-message, create a wrapper
chrome.runtime.sendMessage.callsFake((message, cb, remote) => {
  // Adds a optional third parameter that determines if the message should
  // simulate a message from a remote page. The default is to treat the
  // message as originating from an extension page. This is to prevent erros
  // in code that is unaware of the third option (e.g. user-script-registry.js)
  if (remote) {
    return onMessage(message, {'url': 'fake'}, cb);
  } else {
    return onMessage(message, {'url': 'gm-ext'}, cb);
  }
});
