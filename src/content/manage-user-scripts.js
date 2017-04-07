const defaultIcon = browser.extension.getURL('skin/userscript.png');

let gContainerEl, gScriptTplEl;


function displayOneScript(userScript, replaceEl=null) {
  let menuEl = gScriptTplEl.cloneNode(true);
  menuEl.setAttribute('data-user-script-uuid', userScript.uuid);

  menuEl.querySelector('button.toggle-enabled').textContent
      = userScript.enabled ? 'Disable': 'Enable';

  let icon = document.createElement('img');
  icon.src = userScript.iconBlob
      ? URL.createObjectURL(userScript.iconBlob)
      : defaultIcon;
  menuEl.querySelector('.icon').appendChild(icon);

  menuEl.querySelector('.name').textContent = userScript.name;

  if (replaceEl) {
    gContainerEl.replaceChild(menuEl, replaceEl);
  } else {
    gContainerEl.appendChild(menuEl);
  }
}


function loadAllUserScripts(userScripts) {
  for (let oldEl of gContainerEl.querySelectorAll('.user-script')) {
    oldEl.parentNode.removeChild(oldEl);
  }

  userScripts.sort((a, b) => a.name.localeCompare(b.name));

  let empty = true;
  for (let userScript of userScripts) {
    empty = false;
    displayOneScript(userScript);
  }

  gContainerEl.style.display = empty ? 'none' : '';
  document.querySelector('#empty').style.display = empty ? '' : 'none';
}

///////////////////////////////////////////////////////////////////////////////

window.addEventListener('DOMContentLoaded', event => {
  gContainerEl = document.querySelector('#user-scripts');
  gScriptTplEl = document.querySelector('#templates .user-script');

  document.querySelector('link[rel="icon"]').href
      = browser.runtime.getURL('skin/icon32.png');

  browser.runtime.sendMessage({'name': 'ListUserScripts'})
      .then(loadAllUserScripts);
}, true);


browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.name == 'UserScriptChanged') {
    console.log('manage saw changed script:', message);
    let uuid = message.details.uuid;
    let existingScriptEl = document.querySelector(
        'li.user-script[data-user-script-uuid="' + uuid + '"]') || null;
    displayOneScript(message.details, existingScriptEl);
  }
});


document.querySelector('#user-scripts').addEventListener('click', event => {
  let scriptEl = event.target;
  while (scriptEl
      && scriptEl.classList
      && !scriptEl.classList.contains('user-script')
  ) {
    scriptEl = scriptEl.parentNode;
  }
  if (!scriptEl
      || !scriptEl.classList
      || !scriptEl.classList.contains('user-script')
  ) {
    console.warn('manage got click on non-script item:', event.target);
    return;
  }

  if (event.target.tagName == 'BUTTON') {
    switch (event.target.getAttribute('class')) {
      case 'remove':
        browser.runtime.sendMessage({
          'name': 'UserScriptUninstall',
          'uuid': scriptEl.getAttribute('data-user-script-uuid'),
        }).then(() => {
          scriptEl.parentNode.removeChild(scriptEl);
        });
        break;
      case 'toggle-enabled':
        browser.runtime.sendMessage({
          'name': 'UserScriptToggleEnabled',
          'uuid': scriptEl.getAttribute('data-user-script-uuid'),
        });
        break;
      default:
        console.warn('unhandled button:', event.target);
        break;
    }
  }
}, true);
