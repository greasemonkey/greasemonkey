function openUserScriptEditor(scriptUuid) {
  browser.tabs.create({
    'active': true,
    'url':
        browser.runtime.getURL('src/content/edit-user-script.html')
        + '#' + scriptUuid,
    });
}
