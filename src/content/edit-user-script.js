// TODO: Search, replace.
// TODO: Put name in title.

var editor = CodeMirror(
    document.getElementById('editor'),
    // TODO: Make appropriate options user-configurable.
    {
      'tabSize': 2,
      'lineNumbers': true,
    });

CodeMirror.commands.save = onSave;

const titlePattern = '%s - Greasemonkey User Script Editor';
const userScriptUuid = location.hash.substr(1);
const editorDocs = [];
const editorTabs = [];
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
  editorTabs.push(requireTab);
  editorDocs.push(CodeMirror.Doc(content, 'javascript'));
  editorUrls.push(url);
}

function nameForUrl(url) {
  return unescape(url.replace(/.*\//, '').replace(/[?#].*/, ''));
}

///////////////////////////////////////////////////////////////////////////////

const port = chrome.runtime
                   .connect({'name': 'EditorConnect'});
port.onMessage.addListener(msg => {
  switch (msg.type) {
    case 'userscript':
      loadUserScript(msg);
      break;
    case 'change':
      onUserScriptChanged(msg);
      break;
    default:
      console.warn('Editor port un-handled message type:', msg.type);
  }
});
port.postMessage({'type': 'open', 'uuid': userScriptUuid});

function loadUserScript(message) {
  let userScript = message.details;
  let scriptTab = document.createElement('li');
  scriptTab.className = 'tab active';
  scriptTab.textContent = userScript.name;
  tabs.appendChild(scriptTab);
  editorTabs.push(scriptTab);
  editorDocs.push(CodeMirror.Doc(userScript.content, 'javascript'));
  editorUrls.push(null);

  Object.keys(userScript.requiresContent).forEach(u => {
    addRequireTab(u, userScript.requiresContent[u]);
  });

  editor.swapDoc(editorDocs[0]);
  editor.focus();

  document.title = titlePattern.replace('%s', userScript.name);
}


function onUserScriptChanged(message) {
  let details = message.details;
  let parsedDetails = message.parsedDetails;

  document.title = titlePattern.replace('%s', details.name);

  for (let i = editorDocs.length - 1; i > 0; i--) {
    let u = editorUrls[i];
    if (parsedDetails.requireUrls.indexOf(u) === -1) {
      editorTabs[i].parentNode.removeChild(editorTabs[i]);
      editorDocs.splice(i, 1);
      editorTabs.splice(i, 1);
      editorUrls.splice(i, 1);
    }
  }

  parsedDetails.requireUrls.forEach(u => {
    if (editorUrls.indexOf(u) === -1) {
      addRequireTab(u, details.requiresContent[u]);
    }
  });
}

///////////////////////////////////////////////////////////////////////////////

// TODO: Keyboard accessibility?
tabs.addEventListener('click', event => {
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

  port.postMessage({
    'type': 'save',
    'uuid': userScriptUuid,
    'content': editorDocs[0].getValue(),
    'requires': requires,
  });

  // TODO: Spinner, then only when completed:
  for (let i = 0; i < editorDocs.length; i++) {
    editorDocs[i].markClean();
    editorTabs[i].classList.remove('dirty');
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
