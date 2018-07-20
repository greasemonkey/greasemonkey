'use strict';
let gTplData = {
  'activeScript': {},
  'enabled': undefined,
  'pendingUninstall': 0,
  'options': {
    'globalExcludesStr': '',
  },
  'origin': null,
  'userScripts': {
    'active': [],
    'inactive': [],
  },
};

let gMainFocusedItem = null;
let gPendingTicker = null;
let gScriptTemplates = {};

///////////////////////////////////////////////////////////////////////////////

if ('undefined' == typeof window.getGlobalExcludes) {
  // Equivalent of the version provided by `user-script-registry`, but here.
  // Undefined check because of shared test scope collision.
  window.getGlobalExcludes = function() {
    return gTplData.options.globalExcludesStr.trim()
        .split('\n').map(x => x.trim());
  }
}

///////////////////////////////////////////////////////////////////////////////

function onContextMenu(event) {
  event.preventDefault();
  event.stopPropagation();
}


function onClick(event) {
  if (event.which != 1) {
    event.preventDefault();
    event.stopPropagation();
  } else {
    activate(event.target);
  }
}


function onKeyDown(event) {
  if (event.target.tagName == 'TEXTAREA') return;

  if (event.code == 'Enter') {
    return activate(event.target);
  } else if (event.key == 'ArrowDown') {
    event.preventDefault();
    switchFocus(1);
  } else  if (event.key == 'ArrowUp') {
    event.preventDefault();
    switchFocus(-1);
  }
}


function onLoad() {
  gPendingTicker = setInterval(pendingUninstallTicker, 1000);

  let tabs = null;
  let userScripts = null;
  function finish() {
    numPending--;
    if (numPending > 0) return;

    let url = tabs.length && new URL(tabs[0].url) || null;
    loadScripts(userScripts, url);

    gTplData.origin = url.origin == "null" ? null : url.origin;

    tinybind.formatters.bothArraysEmpty
        = (a, b) => !(!!a.length || !!b.length);
    tinybind.formatters.canAddOrigin = excludesStr => {
      if (!gTplData.origin) return false;

      let originExclude = gTplData.origin + '/*';
      return !getGlobalExcludes().includes(originExclude);
    };

    tinybind.bind(document.body, gTplData);

    document.body.id = 'main-menu';

    setTimeout(window.focus, 0);
  }

  let numPending = 0;

  numPending++;
  chrome.runtime.sendMessage(
      {'name': 'EnabledQuery'},
      enabled => {
        gTplData.enabled = enabled;
        finish();
      });

  numPending++;
  chrome.runtime.sendMessage(
      {'name': 'ListUserScripts', 'includeDisabled': true},
      userScripts_ => {
        userScripts = userScripts_;
        finish();
      });

  numPending++;
  chrome.runtime.sendMessage(
      {'name': 'OptionsLoad'},
      options => {
        gTplData.options.globalExcludesStr = options.excludes;
        finish();
      });

  numPending++;
  chrome.tabs.query(
      {'active': true, 'currentWindow': true},
      tabs_ => {
        tabs = tabs_;
        finish();
      });
}


function onMouseOut() {
  document.activeElement.blur();
}


function onMouseOver(event) {
  let el = event.target;
  while (el && el.tagName != 'MENUITEM') el = el.parentNode;
  if (el && el.hasAttribute('tabindex')) el.focus();
}


function onTransitionEnd() {
  // After a CSS transition has moved a section out of the visible area,
  // force it to be hidden, so that it cannot gain focus.
  for (let section of document.getElementsByTagName('section')) {
    section.style.visibility = (section.className == document.body.id
        ? 'visible' : 'hidden');
  }
}


function onTransitionStart() {
  // While CSS transitioning, keep all sections visible.
  for (let section of document.getElementsByTagName('section')) {
    section.style.visibility = 'visible';
  }
}

///////////////////////////////////////////////////////////////////////////////

// Either by mouse click or <Enter> key, an element has been activated.
function activate(el) {
  if (el.tagName == 'A') {
    setTimeout(window.close, 0);
    return;
  }

  while (el && el.tagName != 'MENUITEM') el = el.parentNode;
  if (!el) return;

  switch (el.className) {
    case 'go-back':
      navigateToMainMenu();
      return;
  }

  switch (el.id) {
    case 'add-exclude-current':
      if (gTplData.origin) {
        gTplData.options.globalExcludesStr =
            gTplData.options.globalExcludesStr.trim() + '\n'
            + gTplData.origin + '/*';
      }
      return;

    case 'backup-export':
      chrome.runtime.sendMessage({'name': 'ExportDatabase'}, logUnhandledError);
      window.close();
      return;
    case 'backup-import':
      let url = chrome.runtime.getURL('src/content/backup/import.html');
      chrome.tabs.create({'active': true, 'url': url});
      window.close();
      return;

    case 'new-user-script':
      newUserScript();
      return;
    case 'toggle-global-enabled':
      browser.runtime.sendMessage({'name': 'EnabledToggle'})
          .then(enabled => gTplData.enabled = enabled);
      return;
    case 'open-options':
      gMainFocusedItem = document.activeElement;
      document.body.id = 'options';
      return;

    case 'user-script-toggle-enabled':
      toggleUserScriptEnabled(gTplData.activeScript.uuid);
      return;
    case 'user-script-toggle-update':
      toggleUserScriptUpdate(gTplData.activeScript.uuid);
      return;
    case 'user-script-edit':
      openUserScriptEditor(gTplData.activeScript.uuid);
      window.close();
      return;
    case 'user-script-uninstall':
      gTplData.pendingUninstall = 10;
      return;
    case 'user-script-undo-uninstall':
      gTplData.pendingUninstall = null;
      return;
    case 'user-script-update-now':
      if (el.disabled) {
        return;
      }

      if (gTplData.activeScript.hasBeenEdited) {
        if (confirm(_('confirm_update_edited'))) {
          startUserScriptUpdate(gTplData.activeScript.uuid);
        }
      } else {
        startUserScriptUpdate(gTplData.activeScript.uuid);
      }

      return;
  }

  let url = el.getAttribute('data-url');
  if (url) {
    chrome.tabs.create({'active': true, 'url': url});
    window.close();
    return;
  }

  if (el.classList.contains('user-script')) {
    let uuid = el.getAttribute('data-uuid');
    navigateToScript(uuid);
    return;
  }

  console.info('activate unhandled:', el);
}


function loadScripts(userScriptsDetail, url) {
  userScriptsDetail.sort((a, b) => a.name.localeCompare(b.name));
  for (let userScriptDetail of userScriptsDetail) {
    let userScript = new EditableUserScript(userScriptDetail);
    let tplItem = userScript.details;
    tplItem.icon = iconUrl(userScript);
    (url && userScript.runsAt(url)
        ? gTplData.userScripts.active
        : gTplData.userScripts.inactive
    ).push(tplItem);
    gScriptTemplates[userScript.uuid] = tplItem;
  }
}


function navigateToMainMenu() {
  switch (document.body.id) {
    case 'options':
      chrome.runtime.sendMessage({
        'name': 'OptionsSave',
        'excludes': gTplData.options.globalExcludesStr.trim(),
      }, logUnhandledError);
      break;
    case 'user-script':
      if (gTplData.pendingUninstall > 0) {
        uninstall(gTplData.activeScript.uuid);
        return;
      }
      gTplData.activeScript = {};
      break;
  }

  document.body.id = 'main-menu';

  if (gMainFocusedItem) {
    gMainFocusedItem.focus();
    gMainFocusedItem = null;
  }
}


function navigateToScript(uuid) {
  gMainFocusedItem = document.activeElement;
  gTplData.activeScript = gScriptTemplates[uuid];
  document.body.id = 'user-script';
}


function newUserScript() {
  let r = Math.floor(Math.random() * 900000 + 100000);
  let name = _('unnamed_script_RAND', r);
  let scriptSource = `// ==UserScript==
// @name     ${name}
// @version  1
// @grant    none
// ==/UserScript==`;
  let downloader
      = new UserScriptDownloader().setScriptContent(scriptSource);
  downloader.start()
      .then(() => {
        downloader.install('install', /*disabled=*/false, /*openEditor=*/true);
      })
      .then(window.close);
}


function pendingUninstallTicker() {
  if (gTplData.pendingUninstall > 0) {
    gTplData.pendingUninstall--;
    if (gTplData.pendingUninstall == 0 && gTplData.activeScript.uuid) {
      uninstall(gTplData.activeScript.uuid);
    }
  }
}


function startUserScriptUpdate(uuid) {
  gTplData.activeScript.updating = true;
  chrome.runtime.sendMessage({
    'name': 'UserScriptUpdateNow',
    'uuid': uuid,
  }, response => {
    logUnhandledError();
    gTplData.activeScript.updating = false;
    // TODO: Something?
    console.log('update response?', response);
  });
}


function switchFocus(move) {
  let section = document.querySelector('section.' + document.body.id);
  let focusable = Array.from(section.querySelectorAll('[tabindex="0"]'));
  let index = focusable.indexOf(document.activeElement);
  if (index == -1 && move == -1) index = 0;
  let l = focusable.length;
  index = (index + move + l) % l;
  focusable[index].focus();
}


function toggleUserScriptEnabled(uuid) {
  chrome.runtime.sendMessage({
    'name': 'UserScriptToggleEnabled',
    'uuid': uuid,
  }, response => {
    logUnhandledError();
    gScriptTemplates[uuid].enabled = response.enabled;
  });
}


function toggleUserScriptUpdate(uuid) {
  chrome.runtime.sendMessage({
    'name': 'UserScriptToggleAutoUpdate',
    'uuid': uuid,
  }, response => {
    logUnhandledError();
    gScriptTemplates[uuid].autoUpdate = response.autoUpdate;
  });
}


function uninstall(uuid) {
  gTplData.pendingUninstall = null;
  chrome.runtime.sendMessage({
    'name': 'UserScriptUninstall',
    'uuid': uuid,
  }, () => {
    logUnhandledError();

    allScriptsLoop:
    for (let i of Object.keys(gTplData.userScripts)) {
      let userScriptContainer = gTplData.userScripts[i];
      for (let j in userScriptContainer) {
        if (!userScriptContainer.hasOwnProperty(j)) continue;
        let script = userScriptContainer[j];
        if (script.uuid == uuid) {
          userScriptContainer.splice(j, 1);
          break allScriptsLoop;
        }
      }
    }
    delete gScriptTemplates[uuid];

    navigateToMainMenu();
  });
}
