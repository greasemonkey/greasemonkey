const defaultIcon = chrome.runtime.getURL('skin/userscript.png');

let gActiveUuid = null;
let gTplData = {
  'activeScript': {},
  'enabled': undefined,
  'userScripts': {
    'active': [],
    'inactive': [],
  },
  'pendingUninstall': 0,
};
let gUserScripts = {};
let gPendingTicker = null;

const gNewScriptTpl = `// ==UserScript==
// @name     Unnamed Script %d
// @version  1
// @grant    none
// ==/UserScript==`;

// Keep global state for keyboard navigation
let gTopMenuSelection = 0;
let gTopMenuTags;
let gScriptMenuSelection = 0;
let gScriptMenuTags;
// Prevent variables from entering scope
(function() {
  let userScriptTopSection = document.getElementById('menu');
  gTopMenuTags = userScriptTopSection.getElementsByTagName('A');

  let userScriptDetailSection = document.getElementById('user-script-detail');
  gScriptMenuTags = userScriptDetailSection.getElementsByTagName('A');
})()

///////////////////////////////////////////////////////////////////////////////

//I.e. from a script detail view, go back to the top view.
function goToTop() {
  if (!gActiveUuid) return;
  checkPendingUninstall();
  document.body.className = '';
  gActiveUuid = null;
  gScriptMenuSelection = 0;
  focusSelection();
}


function loadScripts(userScriptsDetail, url) {
  userScriptsDetail.sort((a, b) => a.name.localeCompare(b.name));
  for (let userScriptDetail of userScriptsDetail) {
    let userScript = new RunnableUserScript(userScriptDetail);
    gUserScripts[userScript.uuid] = userScript;
    let tplItem = {
      'enabled': userScript.enabled,
      'icon': iconUrl(userScript),
      'name': userScript.name,
      'uuid': userScript.uuid,
    };
    (url && userScript.runsAt(url)
        ? gTplData.userScripts.active
        : gTplData.userScripts.inactive
    ).push(tplItem);
  }
}


// Catch when a link has been 'navigated'
function onHashChange(event) {
  event.preventDefault();

  let hash = location.hash;
  // Encode the command behind the first underscore (_)
  let command = hash.split('_', 1)[0];
  // Encode any parameters as the rest of the string
  let parameter = hash.slice(command.length + 1);

  switch (command) {
    case '#open-tab':
      chrome.tabs.create({
        'active': true,
        'url': parameter,
      });
      window.close();
      break;
    case '#menu-top':
      goToTop();
      break;
    case '#menu-uuid':
      let uuid = parameter;
      let userScript = gUserScripts[uuid];

      gTplData.activeScript.icon = iconUrl(userScript);
      gTplData.activeScript.enabled = userScript.enabled;
      gTplData.activeScript.name = userScript.name;

      gActiveUuid = uuid;
      document.body.className = 'detail';
      break;
    case '#toggle-global':
      chrome.runtime.sendMessage(
        {'name': 'EnabledToggle'},
        enabled => gTplData.enabled = enabled);
      // Replace the history state
      history.replaceState({}, 'Home', '#menu-top');
      break;
    case '#new-user-script':
      let r = Math.floor(Math.random() * 900000 + 100000);
      let newScriptSrc = gNewScriptTpl.replace('%d', r);
      chrome.runtime.sendMessage(
          {'name': 'UserScriptInstall', 'source': newScriptSrc},
          uuid => openUserScriptEditor(uuid));
      break;
    case '#toggle-user-script':
      chrome.runtime.sendMessage({
        'name': 'UserScriptToggleEnabled',
        'uuid': gActiveUuid,
      }, response => {
        gUserScripts[gActiveUuid].enabled = response.enabled;
        gTplData.activeScript.enabled = response.enabled;
        tplItemForUuid(gActiveUuid).enabled = response.enabled;
      });
      // Replace the history state
      history.replaceState({}, 'Home', '#menu-uuid_' + gActiveUuid);
      break;
    case '#edit-user-script':
      openUserScriptEditor(gActiveUuid);
      window.close();
      break;
    case '#uninstall-user-script':
      gTplData.pendingUninstall = 10;
      focusSelection();
      break;
    case '#undo-uninstall-user-script':
      gTplData.pendingUninstall = null;
      focusSelection();
      break;
    default:
      console.warn('Unhandled Monkey Menu href:', hash);
      break;
  }
}


function onKeypress(event) {
  let key = event.key;
  if ('Enter' === key) {
    return;
  }
  event.preventDefault();

  let increment;
  switch (key) {
    case 'ArrowUp':
      increment = -1;
    case 'ArrowDown':
      increment = increment || 1;

      incrementIndex(increment);
      focusSelection();
      break;
    }
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
          rivets.bind(document.body, gTplData);
          document.body.classList.remove('rendering');
        });
      });
}


function onUnload(event) {
  // Clear the pending uninstall ticker and cleanup any pending installs.
  clearInterval(gPendingTicker);
  checkPendingUninstall();
}


function openUserScriptEditor(scriptUuid) {
  chrome.tabs.create({
    'active': true,
    'url':
        chrome.runtime.getURL('src/content/edit-user-script.html')
        + '#' + scriptUuid,
    });
}


function tplItemForUuid(uuid) {
  for (let tplItem of gTplData.userScripts.active) {
    if (tplItem.uuid == uuid) return tplItem;
  }
  for (let tplItem of gTplData.userScripts.inactive) {
    if (tplItem.uuid == uuid) return tplItem;
  }
}

////////////////////////////////// KEYBOARD \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

// Normalize the index to fit between 0 and the provided value
function normalizeIndex(index, max) {
  if (index >= max) {
    return max - 1;
  } else if (index < 0) {
    return 0;
  } else {
    return index;
  }
}


// If a Uuid is active then change the script selection otherwise change the
// top menu selection.
function incrementIndex(amount) {
  if (gActiveUuid) {
    let which = gScriptMenuSelection + amount;
    gScriptMenuSelection = normalizeIndex(which, gScriptMenuTags.length - 1);
  } else {
    let index = gTopMenuSelection + amount;
    gTopMenuSelection = normalizeIndex(index, gTopMenuTags.length);
  }
}


// Focus a menu item based on if Uuid is active and the current selection
// value.
function focusSelection() {
  if (gActiveUuid) {
    // For highlighting the uninstall / undo uninstall
    if ('none' == gScriptMenuTags[gScriptMenuSelection].style.display) {
      gScriptMenuTags[gScriptMenuSelection+1].focus();
    } else {
      gScriptMenuTags[gScriptMenuSelection].focus();
    }
  } else {
    gTopMenuTags[gTopMenuSelection].focus();
  }
}

function onKeypress(event) {
  let key = event.key;
  if ('Enter' === key) {
    return;
  }
  event.preventDefault();

  let increment;
  switch (key) {
    case 'ArrowUp':
      increment = -1;
    case 'ArrowDown':
      increment = increment || 1;

      incrementIndex(increment);
      focusSelection();
      break;
    }
}

////////////////////////////////// UNINSTALL \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

function checkPendingUninstall() {
  if (gActiveUuid && gTplData.pendingUninstall) {
    uninstall(gActiveUuid);
  }
}


function pendingUninstallTicker() {
  if (gActiveUuid && gTplData.pendingUninstall) {
    gTplData.pendingUninstall--;
    if (gTplData.pendingUninstall == 0) {
      uninstall(gActiveUuid);
    }
  }
}


function uninstall(scriptUuid) {
  chrome.runtime.sendMessage({
    'name': 'UserScriptUninstall',
    'uuid': scriptUuid,
  }, () => {
    for (i in gTplData.userScripts) {
      let script = gTplData.userScripts[i];
      if (script.uuid == scriptUuid) {
        gTplData.userScripts.splice(i, 1);
        break;
      }
    }
    // Remove the element from the list of top menu tags
    for (i in gTopMenuTags) {
      let uuid = gTopMenuTags.getAttribute('data-uuid');
      if (uuid == scriptUuid) {
        gTopMenuTags.splice(i, 1);
        gTopMenuSelection = normalizeIndex(i - 1, gTopMenuTags.length);
        break;
      }
    }
    gTplData.pendingUninstall = null;
    goToTop();
  });
}
