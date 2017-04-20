// TODO: Search, replace.
// TODO: Put name in title.

var editor = CodeMirror(
    document.getElementById('editor'),
    // TODO: Make appropriate options user-configurable.
    {
      'tabSize': 2,
      'extraKeys': {
        'Ctrl-S': onSave,
      },
      'lineNumbers': true,
    });

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

///////////////////////////////////////////////////////////////////////////////

// TODO: Keyboard accessibility?
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


editor.on('change', change => {
  let selectedTab = document.querySelector('#tabs .tab.active');
  let idx = editorTabs.indexOf(selectedTab);
  let selectedDoc = editorDocs[idx];
  if (selectedDoc.isClean()) {
    selectedTab.classList.remove('dirty');
  } else {
    selectedTab.classList.add('dirty');
  }
});


function onSave() {
  if (document.querySelectorAll('#tabs .tab.dirty').length == 0) {
    return;
  }

  let requires = {};
  for (let i = 1; i < editorDocs.length; i++) {
    requires[ editorUrls[i] ] = editorDocs[i].getValue();
  }

  browser.runtime.sendMessage({
    'name': 'EditorSaved',
    'uuid': userScriptUuid,
    'content': editorDocs[0].getValue(),
    'requires': requires,
  });

  // TODO: Spinner, only when completed then:
  for (let i = 0; i < editorDocs.length; i++) {
    editorDocs[i].markClean();
    editorTabs[i].classList.remove('dirty');
  }
}
