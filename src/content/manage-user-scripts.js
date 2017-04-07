const defaultIcon = browser.extension.getURL('skin/userscript.png');

browser.runtime.sendMessage({'name': 'ListUserScripts'}).then(userScripts => {
  let containerEl = document.querySelector('#user-scripts');
  for (let oldEl of containerEl.querySelectorAll('.user-script')) {
    oldEl.parentNode.removeChild(oldEl);
  }

  userScripts.sort((a, b) => a.name.localeCompare(b.name));

  let empty = true;
  let tplEl = document.querySelector('#templates .user-script');
  for (let userScript of userScripts) {
    empty = false;
    let menuEl = tplEl.cloneNode(true);
    menuEl.setAttribute('data-user-script-uuid', userScript.uuid);

    menuEl.querySelector('button.enable').textContent
        = userScript.enabled ? 'Disable': 'Enable';

    let icon = document.createElement('img');
    icon.src = userScript.iconBlob
        ? URL.createObjectURL(userScript.iconBlob)
        : defaultIcon;
    menuEl.querySelector('.icon').appendChild(icon);

    menuEl.querySelector('.name').textContent = userScript.name;

    containerEl.appendChild(menuEl);
  }

  containerEl.style.display = empty ? 'none' : '';
  document.querySelector('#empty').style.display = empty ? '' : 'none';
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
      default:
        console.warn('unhandled button:', event.target);
        break;
    }
  }
}, true);
