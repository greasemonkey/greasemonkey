let gBtnInstall = document.getElementById('btn-install');
let gDetails = null;
let gInstallCountdown = 9;
let gProgressBar = document.querySelector('progress');
let gRvDetails = {
  'iconUrl': defaultIconUrl,
};
let gUserScriptUrl = unescape(document.location.search.substr(1));


/****************************** CANCEL BUTTON ********************************/

function finish() {
  chrome.tabs.getCurrent(curTab => {
    chrome.tabs.remove(curTab.id);
  });
}

document.getElementById('btn-cancel').addEventListener('click', finish, true);

/****************************** INSTALL BUTTON *******************************/

function onClickInstall(event) {
  gProgressBar.style.display = '';
  chrome.runtime.sendMessage({
    'name': 'UserScriptInstall',
    'details': gDetails,
  });
}
let installCounter = document.createElement('span');
installCounter.textContent = gInstallCountdown;
gBtnInstall.appendChild(document.createTextNode(' '));
gBtnInstall.appendChild(installCounter);
let installTimer = setInterval(function() {
  gInstallCountdown--;
  if (gInstallCountdown) {
    installCounter.textContent = gInstallCountdown;
  } else {
    clearTimeout(installTimer);
    gBtnInstall.removeChild(installCounter);
    gBtnInstall.removeAttribute('disabled');
    gBtnInstall.addEventListener('click', onClickInstall, true);
    gBtnInstall.focus();
  }
}, 250);

/******************************* PROGRESS BAR ********************************/

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  message.progress && (gProgressBar.value = message.progress);
  if (message.progress == 1.0) {
    document.body.className = 'result';
    let resultEl = document.querySelector('#result p');
    // TODO: Style well!
    if (message.errors.length) {
      let errorList = document.createElement('ul');
      message.errors.forEach(error => {
        var errorEl = document.createElement('li');
        errorEl.textContent = error;
        errorList.appendChild(errorEl);
      });
      while (resultEl.firstChild) resultEl.removeChild(resultEl.firstChild);
      resultEl.appendChild(errorList);
    } else {
      // TODO: Localize string.
      resultEl.textContent = _('Download and install successful!');
      gProgressBar.style.display = 'none';
      finish();
    }
  }
});

/****************************** DETAIL DISPLAY *******************************/

window.addEventListener('DOMContentLoaded', event => {
  gDetails = JSON.parse(unescape(document.location.search.substr(1)));

  // TODO: Localize string.
  document.title = _('$1 - Greasemonkey User Script', gDetails.name);
  // Apply the onerror event for the img tag. CSP does not allow it to be done
  // directly in HTML.
  let iconEl = document.querySelector('#install header img');
  iconEl.onerror = () => { gRvDetails.iconUrl = defaultIconurl; };

  // Rivets will mutate its second parameter to have getters and setters,
  // these will break our attempt to pass `gDetails` to background.  So
  // make a second copy of `gDetails`, for Rivets to own.
  let rvDetails = JSON.parse(JSON.stringify(gDetails));
  Object.assign(gRvDetails, rvDetails);

  rivets.bind(document.body, gRvDetails);
});
