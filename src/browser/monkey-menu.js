'use strict';
let gTplData = {
  'activeScript': {},
  'enabled': undefined,
  'userScripts': {
    'active': [],
    'inactive': [],
  },
  'pendingUninstall': 0,
};
let gPendingTicker = null;
let gScriptTemplates = {};

///////////////////////////////////////////////////////////////////////////////

function onContextMenu(event) {
  event.preventDefault();
  event.stopPropagation();
}


function onClick(event) {
  if (event.which != 1) {
    event.preventDefault();
    event.stopPropagation();
    return;
  } else {
    activate(event.target);
  }
}


function onKeyDown(event) {
  if (event.code == 'Enter') return activate(event.target);
  if (event.key == 'ArrowDown') return event.preventDefault(), switchFocus(1);
  if (event.key == 'ArrowUp') return event.preventDefault(), switchFocus(-1);
}


function onLoad(event) {
  gPendingTicker = setInterval(pendingUninstallTicker, 1000);
  chrome.runtime.sendMessage(
      {'name': 'EnabledQuery'},
      enabled => gTplData.enabled = enabled);
  chrome.runtime.sendMessage(
      {'name': 'ListUserScripts', 'includeDisabled': true},
      function(userScripts) {
        chrome.tabs.query({'active': true, 'currentWindow': true}, tabs => {
          let url = tabs.length && new URL(tabs[0].url) || null;
          loadScripts(userScripts, url);

          rivets.formatters.bothArraysEmpty
              = (a, b) => !(!!a.length | !!b.length);
          rivets.bind(document.body, gTplData);

          document.body.id = 'main-menu';

          setTimeout(window.focus, 0);
        });
      });
}


function onMouseOut(event) {
  let el = event.target;
//  while (el && el.tagName != 'MENUITEM') el = el.parentNode;
//  if (el && el.hasAttribute('tabindex')) el.focus();
  document.activeElement.blur();
}


function onMouseOver(event) {
  let el = event.target;
  while (el && el.tagName != 'MENUITEM') el = el.parentNode;
  if (el && el.hasAttribute('tabindex')) el.focus();
}


function onTransitionEnd(event) {
  // After a CSS transition has moved a section out of the visible area,
  // force (via display:none) it to be hidden, so that it cannot gain focus.
  for (let section of document.getElementsByTagName('section')) {
    section.style.visibility = (section.className == document.body.id
        ? 'visible' : 'hidden');
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

  switch (el.id) {
    case 'back':
      navigateToMainMenu();
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

    case 'user-script-toggle-enabled':
      toggleUserScriptEnabled(gTplData.activeScript.uuid);
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
    let userScript = new RunnableUserScript(userScriptDetail);
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
  if (gTplData.pendingUninstall > 0) {
    uninstall(gTplData.activeScript.uuid);
    return;
  }

  // Undo previous "invisible to avoid keyboard focus".
  for (let section of document.getElementsByTagName('section')) {
    section.style.visibility = 'visible';
  }

  gTplData.activeScript = {};
  document.body.id = 'main-menu';
}


function navigateToScript(uuid) {
  // Undo previous "invisible to avoid keyboard focus".
  for (let section of document.getElementsByTagName('section')) {
    section.style.visibility = 'visible';
  }

  gTplData.activeScript = gScriptTemplates[uuid];
  document.body.id = 'user-script';
}

async function newUserScript() {
  let r = Math.floor(Math.random() * 900000 + 100000);
  let name = _('unnamed_script_RAND', r);
  let scriptSource = `// ==UserScript==
// @name     ${name}
// @version  1
// @grant    none
// ==/UserScript==`;
  let downloader
      = new UserScriptDownloader().setScriptContent(scriptSource);
  await downloader.start();
  await downloader.install(/*disabled=*/false, /*openEditor=*/true);
  window.close();
}


function pendingUninstallTicker() {
  if (gTplData.pendingUninstall > 0) {
    gTplData.pendingUninstall--;
    if (gTplData.pendingUninstall == 0 && gTplData.activeScript.uuid) {
      uninstall(gTplData.activeScript.uuid);
    }
  }
}


function switchFocus(move) {
  let focusable = Array.from(document.querySelectorAll('[tabindex=0]'));
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


function uninstall(uuid) {
  gTplData.pendingUninstall = null;
  chrome.runtime.sendMessage({
    'name': 'UserScriptUninstall',
    'uuid': uuid,
  }, () => {
    logUnhandledError();

    allScriptsLoop:
    for (let userScriptContainer of Object.values(gTplData.userScripts)) {
      for (let i in userScriptContainer) {
        let script = userScriptContainer[i];
        if (script.uuid == uuid) {
          userScriptContainer.splice(i, 1);
          break allScriptsLoop;
        }
      }
    }
    delete gScriptTemplates[uuid];

    navigateToMainMenu();
  });
}
