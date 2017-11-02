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


function tplItemForUuid(uuid) {
  for (let tplItem of gTplData.userScripts.active) {
    if (tplItem.uuid == uuid) return tplItem;
  }
  for (let tplItem of gTplData.userScripts.inactive) {
    if (tplItem.uuid == uuid) return tplItem;
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


window.addEventListener('DOMContentLoaded', event => {
  chrome.runtime.sendMessage(
      {'name': 'EnabledQuery'},
      enabled => gTplData.enabled = enabled);
  chrome.runtime.sendMessage(
      {'name': 'ListUserScripts', 'includeDisabled': true},
      function(userScripts) {
        chrome.tabs.query({'active': true}, tabs => {
          let url = tabs.length && new URL(tabs[0].url) || null;
          loadScripts(userScripts, url);
          rivets.bind(document.body, gTplData);
          document.body.classList.remove('rendering');
        });
      });
}, true);


window.addEventListener('click', function(event) {
  let el = event.target;

  if (el.id == 'back') {
    goToTop();
    return;
  }

  while (el && el.classList && !el.classList.contains('menu-item')) {
    el = el.parentNode;
  }
  if (!el || !el.classList || !el.classList.contains('menu-item')) {
    console.warn('monkey menu got click on non-menu item:', event.target);
    return;
  }

  if (el.hasAttribute('data-url')) {
    chrome.tabs.create({
      'active': true,
      'url': el.getAttribute('data-url')
    });
    window.close();
  } else if (el.hasAttribute('data-user-script-uuid')) {
    let uuid = el.getAttribute('data-user-script-uuid');
    let userScript = gUserScripts[uuid];

    gTplData.activeScript.icon = iconUrl(userScript);
    gTplData.activeScript.enabled = userScript.enabled;
    gTplData.activeScript.name = userScript.name;

    gActiveUuid = uuid;
    document.body.className = 'detail';
  } else switch (el.getAttribute('id')) {
    case 'toggle-global-enabled':
      chrome.runtime.sendMessage(
          {'name': 'EnabledToggle'},
          enabled => gTplData.enabled = enabled);
      break;

    case 'user-script-toggle-enabled':
      chrome.runtime.sendMessage({
        'name': 'UserScriptToggleEnabled',
        'uuid': gActiveUuid,
      }, response => {
        gUserScripts[gActiveUuid].enabled = response.enabled;
        gTplData.activeScript.enabled = response.enabled;
        tplItemForUuid(gActiveUuid).enabled = response.enabled;
      });
      break;
    case 'user-script-edit':
      openUserScriptEditor(gActiveUuid);
      window.close();
      break;

    case 'user-script-uninstall':
      gTplData.pendingUninstall = 10;
      break;
    case 'user-script-uninstall-undo':
      gTplData.pendingUninstall = null;
      break;

    default:
      console.warn('unhandled monkey menu item:', el);
      break;
  }
}, true);


// I.e. from a script detail view, go back to the top view.
function goToTop() {
  if (!gActiveUuid) return;
  checkPendingUninstall();
  document.body.className = '';
  gActiveUuid = null;
}


////////////////////////////////// UNINSTALL \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

setInterval(() => {
  if (gActiveUuid && gTplData.pendingUninstall) {
    gTplData.pendingUninstall--;
    if (gTplData.pendingUninstall == 0) {
      uninstall(gActiveUuid);
    }
  }
}, 1000);


function checkPendingUninstall() {
  if (gActiveUuid && gTplData.pendingUninstall) {
    uninstall(gActiveUuid);
  }
}
window.addEventListener('unload', checkPendingUninstall, false);


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
    gTplData.pendingUninstall = null;
    goToTop();
  });
}
