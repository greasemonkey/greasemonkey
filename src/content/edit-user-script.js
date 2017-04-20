// TODO: Mark changed-but-unsaved tabs.
//   markClean(), isClean(), change event
// TODO: Search, replace.
// TODO: Put name in title.

var editor = CodeMirror(
  document.getElementById('editor'),
  // TODO: Make appropriate options user-configurable.
  {
    'tabSize': 2,
    // 'extraKeys': {},  // https://codemirror.net/doc/manual.html#option_keyMap
    'lineNumbers': true,
  });
console.log('code mirror editor:', editor);

const userScriptUuid = location.hash.substr(1);
const editorDocs = [];
const editorTabs = [];
const editorUrls = [];

///////////////////////////////////////////////////////////////////////////////

function nameForUrl(url) {
  return url.replace(/.*\//, '').replace(/[?#].*/, '');
}

///////////////////////////////////////////////////////////////////////////////

browser.runtime.sendMessage({
  'name': 'UserScriptGet',
  'uuid': userScriptUuid,
}).then(userScript => {
  console.log('Got user script:', userScript);

  let tabs = document.getElementById('tabs');

  let scriptTab = document.createElement('li');
  scriptTab.className = 'tab active';
  scriptTab.textContent = nameForUrl(userScript.downloadUrl);
  tabs.appendChild(scriptTab);
  editorTabs.push(scriptTab);
  editorDocs.push(CodeMirror.Doc(userScript.content, 'javascript'));
  editorUrls.push(null);

  Object.keys(userScript.requiresContent).forEach(u => {
    let requireTab = document.createElement('li');
    requireTab.className = 'tab';
    requireTab.textContent = nameForUrl(u);
    tabs.appendChild(requireTab);
    editorTabs.push(requireTab);
    editorDocs.push(
        CodeMirror.Doc(userScript.requiresContent[u], 'javascript'));
    editorUrls.push(u);
  });

  editor.swapDoc(editorDocs[0]);
  editor.focus();
});

document.getElementById('tabs').addEventListener('click', event => {
  if (event.target.classList.contains('tab')) {
    let selectedTab = document.querySelector('#tabs .tab.active');
    selectedTab.classList.remove('active');

    let newTab = event.target;
    newTab.classList.add('active');

    let idx = editorTabs.indexOf(newTab);
    editor.swapDoc(editorDocs[idx]);
    editor.focus();
  }
}, true);

// TODO: Ctrl-S will save active, Shift-Ctrl-S will save all.
