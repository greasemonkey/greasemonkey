function openUserScriptEditor(scriptUuid) {
  let url = chrome.runtime.getURL('src/content/edit-user-script.html')
      + '#' + scriptUuid;
  chrome.tabs.create({
    'active': true,
    'url': url,
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('openUserScriptEditor:', chrome.runtime.lastError);
    }
  });
}
