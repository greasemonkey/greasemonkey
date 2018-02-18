// TODO: Search, replace.

// Change this title as soon as possible, but it won't change later.
document.getElementById('save').setAttribute('title', _('Save'));

var editor = CodeMirror(
    document.getElementById('editor'),
    // TODO: Make appropriate options user-configurable.
    {
      'tabSize': 2,
      'lineNumbers': true,
    });

CodeMirror.commands.save = onSave;

const indexOf = (array, item) => Array.prototype.indexOf.call(array, item);
const userScriptUuid = location.hash.substr(1);
const editorDocs = [];
const editorUrls = [];
const tabs = document.getElementById('tabs');

///////////////////////////////////////////////////////////////////////////////

function addRequireTab(url, content) {
  if (!url) return console.error('addRequireTab missing URL!');
  if (!content) return console.error('addRequireTab missing content!');

  let requireTab = document.createElement('li');
  requireTab.className = 'tab';
  requireTab.textContent = nameForUrl(url);

  tabs.appendChild(requireTab);

  editorDocs.push(CodeMirror.Doc(content, 'javascript'));
  editorUrls.push(url);
}

function nameForUrl(url) {
  return unescape(url.replace(/.*\//, '').replace(/[?#].*/, ''));
}

///////////////////////////////////////////////////////////////////////////////

chrome.runtime.sendMessage({
  'name': 'UserScriptGet',
  'uuid': userScriptUuid,
}, scriptDetails => {
  let scriptTab = document.createElement('li');
  scriptTab.className = 'tab active';
  scriptTab.textContent = scriptDetails.name;

  tabs.appendChild(scriptTab);

  editorDocs.push(CodeMirror.Doc(scriptDetails.content, 'javascript'));
  editorUrls.push(null);

  Object.keys(scriptDetails.requiresContent).forEach(u => {
    addRequireTab(u, scriptDetails.requiresContent[u]);
  });

  editor.swapDoc(editorDocs[0]);
  editor.focus();

  document.title = _('$1 - Greasemonkey User Script Editor', scriptDetails.name);
});

///////////////////////////////////////////////////////////////////////////////

// TODO: Keyboard accessibility?
tabs.addEventListener('click', event => {
  if (event.target.classList.contains('tab')) {
    let selectedTab = document.querySelector('#tabs .tab.active');
    selectedTab.classList.remove('active');

    let newTab = event.target;
    newTab.classList.add('active');

    let idx = indexOf(tabs.children, newTab);
    editor.swapDoc(editorDocs[idx]);
    editor.focus();
  }
}, true);


editor.on('change', change => {
  let selectedTab = document.querySelector('#tabs .tab.active');
  let idx = indexOf(tabs.children, selectedTab);
  let selectedDoc = editorDocs[idx];
  if (selectedDoc.isClean()) {
    selectedTab.classList.remove('dirty');
  } else {
    selectedTab.classList.add('dirty');
  }
});


function onSaveComplete(savedDetails) {
  // TODO: Make `.catch` when switching to promises
  if (chrome.runtime.lastError) {
    // TODO: Display to the user in some way.
    console.log('Error saving script', chrome.runtime.lastError);
    return;
  }

  document.title =
      _('$1 - Greasemonkey User Script Editor', savedDetails.name);

  for (let idx = editorDocs.length; idx--; ) {
    let url = editorUrls[idx];
    if (idx > 0 && !savedDetails.requiresContent[url]) {
      tabs.removeChild(tabs.children.item(idx));
      editorDocs.splice(idx, 1);
      editorUrls.splice(idx, 1);
    } else {
      editorDocs[idx].markClean();
      tabs.children.item(idx).classList.remove('dirty');
    }
  }

  Object.keys(savedDetails.requiresContent).forEach(url => {
    if (editorUrls.indexOf(url) === -1) {
      addRequireTab(url, savedDetails.requiresContent[url]);
    }
  });
}


function onSave() {
  if (document.querySelectorAll('#tabs .tab.dirty').length == 0) {
    return;
  }

  try {
    let requires = {};
    for (let i = 1; i < editorDocs.length; i++) {
      requires[ editorUrls[i] ] = editorDocs[i].getValue();
    }
    let scriptSource = editorDocs[0].getValue();
    let scriptDetails = parseUserScript(scriptSource, null, false);
    scriptDetails.requiresContent = requires;

    chrome.runtime.sendMessage({
      'name': 'UserScriptUpdate',
      'uuid': userScriptUuid,
      'content': scriptSource,
      'details': scriptDetails,
    }, onSaveComplete);
  } catch (err) {
    // TODO: Better UI
    // Most likely due to parseUserScript error
    console.error('Error saving script.', err);
  }
}

///////////////////////////////////////////////////////////////////////////////

editor.on('swapDoc', doc => {
  if (doc.getMode().name == 'javascript') {
    doc.setOption('gutters', ['CodeMirror-lint-markers']);
    doc.setOption('lint', true);
    doc.performLint();
  }
});

document.getElementById('save').addEventListener('click', () => {
  editor.execCommand('save');
});
