const details = JSON.parse(unescape(document.location.search.substr(1)));
document.title = _('$1 - Greasemonkey User Script', details.name);

let rvDetails;
let gRequestId = details.requestId;
delete details.requestId;

function finish() {
  chrome.tabs.getCurrent(curTab => {
    chrome.tabs.remove(curTab.id);
  });
}

/****************************** BG CONNECTION ********************************/

let gPort = chrome.runtime.connect({'name': 'RemoteInstallDialog'});
gPort.onMessage.addListener(message => {
  switch (message.type) {
    case 'progress':
      updateProgress(message.progress);
      break;
    case 'finish':
      finish();
      break;
    case 'error':
      showError(message.errors);
      break;
  }
});
gPort.postMessage({'requestId': gRequestId});
window.addEventListener('beforeunload', () => gPort.disconnect());

/******************************* PROGRESS BAR ********************************/

let gProgressBar = document.getElementById('progress');

function updateProgress(progress) {
  gProgressBar.value = progress;
  if (progress === 1) {
    checkGatekeeper();
  }
}

/****************************** CANCEL BUTTON ********************************/

function loadCancelButton() {
  let btnCancel = document.getElementById('btn-cancel');
  btnCancel.addEventListener('click', finish, true);
}

/****************************** INSTALL BUTTON *******************************/

let installCountdown = 9;

function loadInstallButton() {
  let btnInstall = document.getElementById('btn-install');
  let installText = _('Install');
  btnInstall.textContent = `${installText} ${installCountdown}`;

  let installTimer = setInterval(() => {
    if (--installCountdown) {
      btnInstall.textContent = `${installText} ${installCountdown}`;
    } else {
      clearTimeout(installTimer);
      btnInstall.textContent = installText;
      checkGatekeeper();
    }
  }, 250);
}

function onClickInstall(event) {
  gPort.postMessage();
  gProgressBar.removeAttribute('value');
}

/******************************** GATEKEEPER *********************************/

function checkGatekeeper() {
  // Don't allow install until both the countdown and script download have
  // finished.
  if (!installCountdown && progress.value === 1) {
    let btnInstall = document.getElementById('btn-install');
    btnInstall.removeAttribute('disabled');
    btnInstall.addEventListener('click', onClickInstall, true);
    btnInstall.focus();
  }
}


function showError(errors) {
  document.body.className = 'errors';
  rvDetails.errors.push.apply(rvDetails.errors, errors);
}

/****************************** DETAIL DISPLAY *******************************/

window.addEventListener('DOMContentLoaded', event => {
  // Apply the onerror event for the img tag. CSP does not allow it to be done
  // directly in HTML.
  let iconEl = document.getElementById('script-icon');
  iconEl.onerror = () => { iconEl.src = defaultIconUrl; };

  loadCancelButton();
  loadInstallButton();

  // Rivets will mutate its second parameter to have getters and setters,
  // these will break our attempt to pass `details` to background.  So
  // make a second copy of details, for Rivets to own.
  rvDetails = JSON.parse(unescape(document.location.search.substr(1)));

  // The fallback to default icon won't work unless iconUrl has at least an
  // empty string.
  rvDetails.iconUrl = rvDetails.iconUrl || '';
  // Set an empty array for errors
  rvDetails.errors = [];

  rivets.bind(document.body, rvDetails);
});
