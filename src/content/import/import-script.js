
function onLoad(event) {
  document.getElementById('import-script-file')
      .addEventListener('change', onImportUserScript);
}


function onImportUserScript(event) {
  let importScript = event.target;
  let fr = new FileReader();

  fr.onload = () => {
    if (2 === fr.readyState) {
      // Done loading
      chrome.runtime.sendMessage(
          {'name': 'UserScriptInstall', 'source': fr.result},
          uuid => {
            // TODO: When switching to promises use `.catch`
            if (!chrome.runtime.lastError) {
              openUserScriptEditor(uuid);
            }
          });
    }
  };
  fr.readAsText(importScript.files[0]);
}


// Copy paste from monkey menu for convenience
function openUserScriptEditor(scriptUuid) {
  chrome.tabs.create({
    'active': true,
    'url':
        chrome.runtime.getURL('src/content/edit-user-script.html')
        + '#' + scriptUuid,
  });
  chrome.tabs.getCurrent(curTab => {
    chrome.tabs.remove(curTab.id);
  });
}


document.addEventListener('DOMContentLoaded', onLoad);
