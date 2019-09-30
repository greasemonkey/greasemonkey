'use strict';
let gUserScript = null;

const macKeymap = CodeMirror.normalizeKeyMap({
  'Cmd-/': 'toggleComment',
});
const pcKeymap = CodeMirror.normalizeKeyMap({
  'Ctrl-/': 'toggleComment',
});

const isMacKeymap = CodeMirror.keyMap.default == CodeMirror.keyMap.macDefault;

const editor = CodeMirror(
    document.getElementById('editor'),
    // TODO: Make appropriate options user-configurable.
    {
      'tabSize': 2,
      'lineNumbers': true,
      'extraKeys': isMacKeymap ? macKeymap : pcKeymap,
    });

CodeMirror.commands.save = onSave;

let modalTimer = null;

const userScriptUuid = location.hash.substr(1);
const editorDocs = [];
const editorTabs = [];
const editorUrls = [];
const tabs = document.getElementById('tabs');
const gTplData = {
  'name': '',
  'modal': {
    'closeDisabled': true,
    'errorList': [],
    'title': _('saving')
  }
};
// Change the title of the save icon (and more) to initial values.
tinybind.bind(document, gTplData);

document.querySelector('#modal footer button')
    .addEventListener('click', modalClose);

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

chrome.runtime.sendMessage({
  'name': 'UserScriptGet',
  'uuid': userScriptUuid,
}, userScript => {
  gUserScript = userScript;

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

  gTplData.name = userScript.name;
});

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


editor.on('change', () => {
  let selectedTab = document.querySelector('#tabs .tab.active');
  let idx = editorTabs.indexOf(selectedTab);
  let selectedDoc = editorDocs[idx];
  if (selectedDoc.isClean()) {
    selectedTab.classList.remove('dirty');
  } else {
    selectedTab.classList.add('dirty');
  }
});


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


window.addEventListener('beforeunload', event => {
  let isDirty = editorDocs.some(doc => {
    return !doc.isClean();
  });
  if (isDirty) {
    event.preventDefault();
  }
});

///////////////////////////////////////////////////////////////////////////////

function modalClose() {
  clearTimeout(modalTimer);

  document.body.classList.remove('save');
  gTplData.modal.closeDisabled = true;
  gTplData.modal.errorList = [];
  editor.getInputField().focus();
}


function modalFill(e) {
  if (e instanceof DownloadError) {
    gTplData.modal.errorList = e.failedDownloads.map(
        d => _('ERROR_at_URL', d.error, d.url));
  } else if (e.message) {
    gTplData.modal.errorList = [e.message];
  } else {
    // Log the unknown error.
    console.error('Unknown save error saving script', e);
    gTplData.modal.errorList = [_('download_error_unknown')];
  }
  gTplData.modal.closeDisabled = false;
}


function modalOpen() {
  document.querySelector('#modal progress').value = 0;
  document.body.classList.add('save');
  editor.getInputField().blur();
}


function onSave() {
  if (document.querySelectorAll('#tabs .tab.dirty').length == 0) {
    return;
  }

  // Always use a downloader to save, in case of new remotes.
  let downloader = new UserScriptDownloader();
  downloader.setScriptUrl(gUserScript.downloadUrl);
  downloader.setScriptContent(editorDocs[0].getValue());

  let requires = {};
  for (let i = 1; i < editorDocs.length; i++) {
    requires[ editorUrls[i] ] = editorDocs[i].getValue();
  }
  downloader.setKnownRequires(requires);
  downloader.setKnownResources(gUserScript.resources);
  downloader.setKnownUuid(userScriptUuid);
  downloader.addProgressListener(() => {
    document.querySelector('#modal progress').value = downloader.progress;
  });

  modalTimer = setTimeout(modalOpen, 75);
  downloader
      .start()
      .then(() => {
        return browser.runtime.sendMessage({
          'name': 'UserScriptGet',
          'uuid': userScriptUuid,
        });
      })
      .then(userScript => {
        let details = userScript || gUserScript;
        document.querySelector('#modal progress').removeAttribute('value');
        return downloader.install('edit', !details.enabled);
      }).then(onSaveComplete)
      .catch(modalFill);
}


function onSaveComplete(savedDetails) {
  modalClose();

  gTplData.name = savedDetails.name;
  tabs.children[0].textContent = savedDetails.name;

  for (let i = editorDocs.length; i--; ) {
    let url = editorUrls[i];
    if (i > 0 && !savedDetails.requiresContent[url]) {
      editorTabs[i].parentNode.removeChild(editorTabs[i]);
      editorDocs.splice(i, 1);
      editorTabs.splice(i, 1);
      editorUrls.splice(i, 1);
    } else {
      editorDocs[i].markClean();
      editorTabs[i].classList.remove('dirty');
    }
  }

  Object.keys(savedDetails.requiresContent).forEach(u => {
    if (editorUrls.indexOf(u) === -1) {
      addRequireTab(u, savedDetails.requiresContent[u]);
    }
  });
}
