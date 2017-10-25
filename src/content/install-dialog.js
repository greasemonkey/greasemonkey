const details = JSON.parse(unescape(document.location.search.substr(1)));
document.title = details.name + ' - Greasemonkey User Script';


function finish() {
  if (history.length > 1) {
    history.back();
  } else {
    window.close();  // May fail -- message to BG?
  }
}


let btnCancel = document.getElementById('btn-cancel');
btnCancel.addEventListener('click', finish, true);

/****************************** INSTALL BUTTON *******************************/

let installCountdown = 9;
let btnInstall = document.getElementById('btn-install');
function onClickInstall(event) {
  chrome.runtime.sendMessage({
    'name': 'UserScriptInstall',
    'details': details,
  });

  let footerEl = document.getElementById('footer');
  while (footerEl.firstChild) {
    footerEl.removeChild(footerEl.firstChild);
  }
  footerEl.appendChild(progressBar);
}
let installCounter = document.createElement('span');
installCounter.textContent = installCountdown;
btnInstall.appendChild(document.createTextNode(' '));
btnInstall.appendChild(installCounter);
let installTimer = setInterval(function() {
  installCountdown--;
  if (installCountdown) {
    installCounter.textContent = installCountdown;
  } else {
    clearTimeout(installTimer);
    btnInstall.removeChild(installCounter);
    btnInstall.removeAttribute('disabled');
    btnInstall.addEventListener('click', onClickInstall, true);
    btnInstall.focus();
  }
}, 250);

/******************************* PROGRESS BAR ********************************/

let progressBar = document.createElement('progress');

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  message.progress && (progressBar.value = message.progress);
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
      resultEl.textContent = 'Download and install successful!';
      progressBar.parentNode && progressBar.parentNode.removeChild(progressBar);
      finish();
    }
  }
});

/****************************** DETAIL DISPLAY *******************************/

window.addEventListener('DOMContentLoaded', event => {
  // Rivets will mutate its second parameter to have getters and setters,
  // these will break our attempt to pass `details` to background.  So
  // make a second copy of details, for Rivets to own.
  let rvDetails = JSON.parse(unescape(document.location.search.substr(1)));

  // The fallback to default icon won't work unless iconUrl has at least an
  // empty string.
  rvDetails.iconUrl = rvDetails.iconUrl || "";

  rivets.bind(document.body, rvDetails);
});
