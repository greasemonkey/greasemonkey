let gBtnInstall = document.getElementById('btn-install');
let gDetails = null;
let gInstallCountdown = 9;
let gProgressBar = document.querySelector('progress');
let gRvDetails = {
  'iconUrl': defaultIconUrl,
};
let gUserScriptUrl = unescape(document.location.search.substr(1));

let gDownloader = new UserScriptDownloader().setScriptUrl(gUserScriptUrl);

/******************************* PROGRESS BAR ********************************/

gDownloader.addProgressListener(() => {
  gProgressBar.value = gDownloader.progress;

  if (gDownloader.errors.length > 0) {
    let errorList = document.createElement('ul');
    message.errors.forEach(error => {
      var errorEl = document.createElement('li');
      errorEl.textContent = error;
      errorList.appendChild(errorEl);
    });
    while (resultEl.firstChild) resultEl.removeChild(resultEl.firstChild);
    resultEl.appendChild(errorList);
  } else {
    if (gDownloader.progress == 1) {
      gProgressBar.style.display = 'none';
    }
    maybeEnableInstall();
  }
});

/****************************** DETAIL DISPLAY *******************************/

gDownloader.scriptDetails.then(scriptDetails => {
  gDetails = scriptDetails;

  // TODO: Localize string.
  document.title = _('NAME_greasemonkey_user_script', gDetails.name);
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

  document.body.className = 'install';
}).catch(err => {
  // TODO: Show error results HTML.
  console.warn('installer could not get script details:', err);
});

/******************************* CANCEL BUTTON *******************************/

function finish() {
  chrome.tabs.getCurrent(curTab => {
    chrome.tabs.remove(curTab.id);
  });
}

document.getElementById('btn-cancel').addEventListener('click', finish, true);

/****************************** INSTALL BUTTON *******************************/

async function onClickInstall(event) {
  document.body.className = 'result';
  let resultEl = document.querySelector('#result p');
  // TODO: Localize string.
  resultEl.textContent = _('download_and_install_successful');

  gDownloader.install();

  // TODO: Wait for success reply?
  finish();
}


function maybeEnableInstall() {
  if (gInstallCountdown) return;
  if (gDownloader.progress < 1) return;

  gBtnInstall.addEventListener('click', onClickInstall, true);
  gBtnInstall.removeAttribute('disabled');
  gBtnInstall.focus();
}


(() => {
  let installCounter = document.createElement('span');
  installCounter.textContent = ' ' + gInstallCountdown;
  gBtnInstall.appendChild(installCounter);
  let installTimer = setInterval(function() {
    gInstallCountdown--;
    if (gInstallCountdown) {
      installCounter.textContent = ' ' + gInstallCountdown;
    } else {
      clearTimeout(installTimer);
      maybeEnableInstall();
      installCounter.parentNode.removeChild(installCounter);
    }
  }, 250);
})();

/*****************************************************************************/

gDownloader.start();
