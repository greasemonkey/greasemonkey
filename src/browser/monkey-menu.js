(function() {

const defaultIcon = chrome.runtime.getURL('skin/userscript.png');
let gUserScripts = {};
let gActiveUuid = null;


function setEnabledIcon(enabled, el) {
  el.classList.remove('fa-square-o');
  el.classList.remove('fa-check-square-o');
  el.classList.add(enabled ? 'fa-check-square-o' : 'fa-square-o');
}

function showScriptEnabledState(enabled) {
  let el = document.querySelector('#user-script-toggle-enabled .icon');
  setEnabledIcon(enabled, el);
}

function showGlobalEnabledState(enabled) {
  let enabledEl = document.querySelector('#toggle-global-enabled .icon');
  setEnabledIcon(enabled, enabledEl);
  // TODO: Change the text!
};
chrome.runtime.sendMessage({'name': 'EnabledQuery'}, showGlobalEnabledState);


chrome.runtime.sendMessage(
    {'name': 'ListUserScripts', 'includeDisabled': true}, userScripts => {
  let containerEl = document.querySelector('#user-scripts');
  for (let oldEl of containerEl.querySelectorAll('.user-script-menu-item')) {
    oldEl.parentNode.removeChild(oldEl);
  }

  userScripts.sort((a, b) => a.name.localeCompare(b.name));

  let empty = true;
  let tplEl = document.querySelector('#templates .user-script-menu-item > div');
  for (let userScript of userScripts) {
    gUserScripts[userScript.uuid] = userScript;

    empty = false;
    let menuEl = tplEl.cloneNode(true);
    menuEl.setAttribute('data-user-script-uuid', userScript.uuid);

    if (!userScript.enabled) menuEl.classList.add('disabled');

    let icon = document.createElement('img');
    icon.src = userScript.iconBlob
        ? URL.createObjectURL(userScript.iconBlob)
        : defaultIcon;
    menuEl.querySelector('.icon').appendChild(icon);

    menuEl.querySelector('.name').textContent = userScript.name;
    containerEl.appendChild(menuEl);
  }

  containerEl.style.display = empty ? 'none' : '';
});


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

    let tplEl = document.querySelector('#templates .user-script-detail');
    let detailEl = tplEl.cloneNode(true);
    let contEl = document.getElementById('user-script');
    while (contEl.firstChild) contEl.removeChild(contEl.firstChild);
    contEl.appendChild(detailEl);

    detailEl.querySelector('header #name').textContent = userScript.name;
    showScriptEnabledState(userScript.enabled);

    document.body.className = 'detail';
    gActiveUuid = uuid;
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
          () => chrome.runtime.sendMessage(
              {'name': 'EnabledQuery'}, showGlobalEnabledState));;
      break;

    case 'user-script-toggle-enabled':
      chrome.runtime.sendMessage({
        'name': 'UserScriptToggleEnabled',
        'uuid': gActiveUuid,
      }, response => {
        showScriptEnabledState(response.enabled);
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

})();
