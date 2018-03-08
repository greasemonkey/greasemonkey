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

const gPlaceHolder = '%d';
const gUnnamedScript = _('unnamed_script_RAND', gPlaceHolder);

const gNewScriptTpl = `// ==UserScript==
// @name     ${gUnnamedScript}
// @version  1
// @grant    none
// ==/UserScript==`;

// Keep global state for keyboard navigation
let gTopMenuSelection = 0;
let gTopMenuTags = [];
let gScriptMenuSelection = 0;
let gScriptMenuTags = [];
let gLastHashChangeWasKey = false;

///////////////////////////////////////////////////////////////////////////////

//I.e. from a script detail view, go back to the top view.
function goToTop() {
  if (!gActiveUuid) return;
  checkPendingUninstall();
  document.body.className = '';
  gActiveUuid = null;
  gScriptMenuSelection = 0;
  if (gLastHashChangeWasKey) {
    focusSelection();
  }
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


// Catch when a link has been 'navigated'.
async function onHashChange(event) {
  event.preventDefault();

  let hash = location.hash;

  switch (hash) {
    case '#menu-top':
      goToTop();
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
      let newScriptSrc = gNewScriptTpl.replace(gPlaceHolder, r);
      let downloader
          = new UserScriptDownloader().setScriptContent(newScriptSrc);
      await downloader.start();
      await downloader.install(/*disabled=*/false, /*openEditor=*/true);
      window.close();
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
      history.replaceState({}, 'Home', '#' + gActiveUuid);
      break;
    case '#edit-user-script':
      openUserScriptEditor(gActiveUuid);
      window.close();
      break;
    case '#uninstall-user-script':
      gTplData.pendingUninstall = 10;
      if (gLastHashChangeWasKey) {
        focusSelection();
      }
      break;
    case '#undo-uninstall-user-script':
      gTplData.pendingUninstall = null;
      if (gLastHashChangeWasKey) {
        focusSelection();
      }
      break;
    default:
      // Check if it's a Userscript by examing the gUserScript object
      let userScript = gUserScripts[hash.slice(1)];
      if (userScript) {
        // Found a userscript, set individual script page
        gTplData.activeScript.icon = iconUrl(userScript);
        gTplData.activeScript.enabled = userScript.enabled;
        gTplData.activeScript.name = userScript.name;
        gTplData.activeScript.uuid = userScript.uuid;

        gActiveUuid = userScript.uuid;
        document.body.className = 'detail';
        document.getElementById('user-script-detail').style.display = 'block';
        return;
      }

      // Check for a valid URL.
      try {
        let link = new URL(hash.slice(1));
        chrome.tabs.create({
          'active': true,
          'url': link.href,
        });
        window.close();
      } catch (err) {
        if ('TypeError' === err.name) {
          // Indicates a bad URL
          console.log(
              'Unknown Monkey Menu item, not a valid Uuid nor a url', hash);
        } else {
          console.log(
              'Unknown error parsing Monkey Menu item as url', hash, err);
        }
      }
      break;
  }
  // Reset whether has change was from a click or keyboard
  gLastHashChangeWasKey = false;
}


function onClick(event) {
  if (event.which === 3) {  // Right mouse click.
    if (!gActiveUuid) {
      const elements = document.querySelectorAll(':hover');
      // Last element is the name of the script; last but one is the anchor.
      const hash = elements[elements.length - 2].hash;
      if (hash) {
        const userScript = gUserScripts[hash.slice(1)];
        if (userScript) {
          gActiveUuid = userScript.uuid;
        }
      }
    }
    if (gActiveUuid) {
      openUserScriptEditor(gActiveUuid);
      gActiveUuid = null;
    }
    window.close();
    event.preventDefault();
  }
}


function onKeypress(event) {
  let key = event.key;
  if ('Enter' === key) {
    gLastHashChangeWasKey = true;
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

  gTopMenuTags = document.getElementById('menu').getElementsByTagName('a');
  gScriptMenuTags = document.querySelectorAll('#user-script-detail a');

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

  // Set up listeners for the transition effect. Set display: none when the
  // visibility property is changed.
  for (el of document.getElementsByTagName('section')) {
    if (el.id !== 'menu') {
      el.style.display = 'none';
      el.addEventListener('transitionend', event => {
        if ('visibility' === event.propertyName) {
          event.target.style.display = 'none';
        }
      });
    }
  }
}


function onUnload(event) {
  // Clear the pending uninstall ticker and cleanup any pending installs.
  clearInterval(gPendingTicker);
  checkPendingUninstall();
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
    for (let tag = null, i = 0; tag = gTopMenuTags[i]; i++) {
      let uuid = tag.getAttribute('data-uuid');
      if (uuid == scriptUuid) {
        gTopMenuTags[i].remove();
        gTopMenuSelection = normalizeIndex(i - 1, gTopMenuTags.length);
        break;
      }
    }

    gTplData.pendingUninstall = null;
    goToTop();
  });
}
