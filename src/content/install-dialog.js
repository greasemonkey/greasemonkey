let gBtnInstall = document.getElementById('btn-install');
let gDetails = null;
let gInstallCountdown = 9;
let gProgressBar = document.querySelector('progress');
let gRvDetails = {
  'iconUrl': defaultIconUrl,
  'errorHeader': '',
  'errorList': [],
};
let gUserScriptUrl = unescape(document.location.search.substr(1));

let gDownloader = new UserScriptDownloader().setScriptUrl(gUserScriptUrl);

/******************************* PROGRESS BAR ********************************/

gDownloader.addProgressListener(() => {
  gProgressBar.value = gDownloader.progress;
});

/****************************** DETAIL DISPLAY *******************************/

gDownloader.scriptDetails.then(scriptDetails => {
  gDetails = scriptDetails;

  // TODO: Localize string.
  document.title = _('NAME_greasemonkey_user_script', gDetails.name);
  // Apply the onerror event for the img tag. CSP does not allow it to be done
  // directly in HTML.
  let iconEl = document.querySelector('#install header img');
  iconEl.onerror = () => { gRvDetails.iconUrl = defaultIconUrl; };

  // Rivets will mutate its second parameter to have getters and setters,
  // these will break our attempt to pass `gDetails` to background.  So
  // make a second copy of `gDetails`, for Rivets to own.
  let rvDetails = JSON.parse(JSON.stringify(gDetails));
  Object.assign(gRvDetails, rvDetails);

  rivets.bind(document.body, gRvDetails);

  document.body.className = 'install';
}).catch(err => {
  // TODO: Show error HTML.
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

function onClickInstall(event) {
  gProgressBar.removeAttribute('value');
  let disabled = document.getElementById('install-disabled').checked;
  let openEditor = document.getElementById('open-editor-after').checked;
  gDownloader.install(disabled, openEditor).then(finish).catch(err => {
    gRvDetails.errorHeader = _('install_failed');
    gRvDetails.errorList = [err.message];
    document.body.className = 'error';
  });
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

gDownloader.start().then(() => {
  gProgressBar.style.display = 'none';
  maybeEnableInstall();
}).catch(e => {
  gRvDetails.errorHeader = _('download_failed');
  if (e instanceof DownloadError) {
    gRvDetails.errorList = e.failedDownloads.map(
        d => _('ERROR_at_URL', d.error, d.url));
  } else if (e.message) {
    gRvDetails.errorList = [e.message];
  } else {
    // Log the unknown error.
    console.error('Unknown save error in install dialog', e);
    gRvDetails.errorList = [_('download_error_unknown')];
  }
  document.body.className = 'error';
});
