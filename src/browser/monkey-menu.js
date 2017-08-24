const defaultIcon = chrome.runtime.getURL('skin/userscript.png');

let gActiveUuid = null;
let gTplData = {
  'activeScript': {},
  'enabled': undefined,
  'userScripts': [],
};
let gUserScripts = {};


function tplItemForUuid(uuid) {
  for (let tplItem of gTplData.userScripts) {
    if (tplItem.uuid == uuid) return tplItem;
  }
}


function loadScripts(userScripts) {
  for (let userScript of userScripts) {
    gUserScripts[userScript.uuid] = userScript;
    let tplItem = {
      'enabled': userScript.enabled,
      'icon': iconUrl(userScript),
      'name': userScript.name,
      'uuid': userScript.uuid,
    };
    gTplData.userScripts.push(tplItem);
  }
}


window.addEventListener('DOMContentLoaded', event => {
  chrome.runtime.sendMessage(
      {'name': 'EnabledQuery'},
      enabled => gTplData.enabled = enabled);
  chrome.runtime.sendMessage(
      // TODO: For current URL only.
      {'name': 'ListUserScripts', 'includeDisabled': true},
      function(userScripts) {
        loadScripts(userScripts);
        rivets.bind(document.body, gTplData);
        document.body.classList.remove('rendering');
      });
}, true);


window.addEventListener('click', function(event) {
  let el = event.target;

  if (el.id == 'back') {
    document.body.className = '';
    gActiveUuid = null;
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
    case 'manage-scripts':
      chrome.tabs.create({
        'url': chrome.runtime.getURL('src/content/manage-user-scripts.html'),
      });
      window.close();
      break;
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
        gTplData.activeScript.enabled = response.enabled;
        tplItemForUuid(gActiveUuid).enabled = response.enabled;
      });
      break;
    case 'user-script-edit':
      openUserScriptEditor(gActiveUuid);
      window.close();
      break;

    default:
      console.warn('unhandled monkey menu item:', el);
      break;
  }
}, true);
