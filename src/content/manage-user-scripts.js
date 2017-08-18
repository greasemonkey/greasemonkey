const defaultIcon = chrome.runtime.getURL('skin/userscript.png');

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
}

///////////////////////////////////////////////////////////////////////////////

window.addEventListener('DOMContentLoaded', event => {
  gContainerEl = document.querySelector('#user-scripts');
  gScriptTplEl = document.querySelector('#templates .user-script');

  chrome.runtime.sendMessage(
      {'name': 'ListUserScripts', 'includeDisabled': true},
      loadAllUserScripts);
}, true);


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
  let scriptUuid = scriptEl.getAttribute('data-user-script-uuid');

  if (event.target.tagName == 'BUTTON') {
    switch (event.target.getAttribute('class')) {
      case 'edit':
        // I really want a distinct and chrome-less window here, but it's
        // giving me headaches.  (What do normal, popup, panel, detached_panel
        // do?  everything but normal seems to create a chrome-less window
        // (which I want), but also always-on-top (which I don't).
        // Plus it puts "mos-extension://uuid" in front of the title =/
        chrome.tabs.create({
            'active': true,
            'url':
                chrome.runtime.getURL('src/content/edit-user-script.html')
                + '#' + scriptUuid,
            });
        break;
      case 'remove':
        chrome.runtime.sendMessage({
          'name': 'UserScriptUninstall',
          'uuid': scriptEl.getAttribute('data-user-script-uuid'),
        }, () => {
          scriptEl.parentNode.removeChild(scriptEl);
        });
        break;
      case 'toggle-enabled':
        chrome.runtime.sendMessage({
          'name': 'UserScriptToggleEnabled',
          'uuid': scriptUuid,
        });
        break;
      default:
        console.warn('unhandled button:', event.target);
        break;
    }
  }
}, true);
