let gTplData = {'userScripts': []};


function displayScript(userScript) {
  let push = false;
  let tplItem = null;
  for (let s of gTplData.userScripts) {
    if (s.uuid == userScript.uuid) {
      tplItem = s;
      break;
    }
  }
  if (tplItem == null) {
    tplItem = {};
    push = true;
  }

  tplItem.enabled = userScript.enabled;
  tplItem.icon = iconUrl(userScript);
  tplItem.name = userScript.name;
  tplItem.uuid = userScript.uuid;

  if (push) gTplData.userScripts.push(tplItem);
}


function loadAllUserScripts(userScripts) {
  for (let userScript of userScripts) {
    displayScript(userScript);
  }
  gTplData.userScripts.sort((a, b) => a.name.localeCompare(b.name));
}

///////////////////////////////////////////////////////////////////////////////

window.addEventListener('DOMContentLoaded', event => {
  chrome.runtime.sendMessage(
      {'name': 'ListUserScripts', 'includeDisabled': true},
      function(userScripts) {
        loadAllUserScripts(userScripts);
        rivets.bind(document.getElementById('user-scripts'), gTplData);
        document.body.classList.remove('rendering');
      });
}, true);


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.name == 'UserScriptChanged') {
    displayScript(message.details);
    gTplData.userScripts.sort((a, b) => a.name.localeCompare(b.name));
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
    switch (event.target.getAttribute('data-action')) {
      case 'edit':
        // I really want a distinct and chrome-less window here, but it's
        // giving me headaches.  (What do normal, popup, panel, detached_panel
        // do?  everything but normal seems to create a chrome-less window
        // (which I want), but also always-on-top (which I don't).
        // Plus it puts "mos-extension://uuid" in front of the title =/
        openUserScriptEditor(scriptUuid);
        break;
      case 'remove':
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
