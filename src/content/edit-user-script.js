var editor = CodeMirror(document.getElementById('editor'));
console.log('code mirror editor:', editor);

const userScriptUuid = location.hash.substr(1);
let contents = [];

browser.runtime.sendMessage({
  'name': 'UserScriptGet',
  'uuid': userScriptUuid,
}).then(userScript => {
  console.log('Got user script:', userScript);

  let tabs = document.getElementById('tabs');

  let scriptTab = document.createElement('li');
  scriptTab.className = 'tab active';
  scriptTab.textContent = 'User Script';
  tabs.appendChild(scriptTab);

  contents.push(userScript.content);
  editor.setValue(userScript.content);

  // TODO: requires here, but with what tab name?
});

document.getElementById('tabs').addEventListener('click', event => {
  console.log('tabs click:', event);
  // TODO: Switch editor contents, saving cursor/scroll positions.
}, true);

// TODO: Ctrl-S will save active, Shift-Ctrl-S will save all.
