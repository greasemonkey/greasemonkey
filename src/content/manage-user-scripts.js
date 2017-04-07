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

    menuEl.querySelector('button.enable').textContent
        = userScript.enabled ? 'Disable': 'Enable';

    let icon = document.createElement('img');
    icon.src = userScript.icon ? userScript.icon : defaultIcon;
    menuEl.querySelector('.icon').appendChild(icon);

    menuEl.querySelector('.name').textContent = userScript.name;

    containerEl.appendChild(menuEl);
  }

  containerEl.style.display = empty ? 'none' : '';
  document.querySelector('#empty').style.display = empty ? '' : 'none';
});

document.querySelector('#user-scripts').addEventListener('click', event => {
  console.info('handle click on:', event.target);
}, true);
