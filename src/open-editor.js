function openUserScriptEditor(scriptUuid) {
  chrome.tabs.create({
    'active': true,
    'url':
        chrome.runtime.getURL('src/content/edit-user-script.html')
        + '#' + scriptUuid,
    });
}
