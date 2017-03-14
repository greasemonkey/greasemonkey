let details = JSON.parse(unescape(document.location.search.substr(1)));

let installCountdown = 9;
let btnInstall = document.getElementById('btn-install');
function onClickInstall(event) {
  console.log('in install-dialog, clicked install!', details.downloadUrl);

  browser.runtime.sendMessage({
    'name': 'UserScriptInstall',
    'details': details
  });

  // Switch to/reveal <progress> bar?
}
let installCounter = document.createElement('span');
installCounter.textContent = installCountdown;
btnInstall.appendChild(document.createTextNode(' '));
btnInstall.appendChild(installCounter);
let installTimer = setInterval(() => {
  installCountdown--;
  if (installCountdown) {
    installCounter.textContent = installCountdown;
  } else {
    clearTimeout(installTimer);
    btnInstall.removeChild(installCounter);
    btnInstall.classList.remove('disabled');
    btnInstall.addEventListener('click', onClickInstall, true);
  }
}, 250);


let iconContEl = document.querySelector(
    '.panel .panel-section-header .icon-section-header');
let iconEl = document.createElement('img');
iconEl.src = details.iconUrl || browser.extension.getURL('skin/userscript.png');
iconContEl.appendChild(iconEl);

document.getElementById('name').textContent = details.name;
if (details.version) {
  document.getElementById('version').textContent = details.version;
}


function addStringsToList(containerEl, listEl, strings) {
  if (strings.length == 0) {
    containerEl.style.display = 'none';
  } else {
    strings.forEach(v => {
      var el = document.createElement('li');
      el.textContent = v;
      listEl.append(el);
    });
  }
}


addStringsToList(
    document.getElementById('includes'),
    document.querySelector('#includes ul'),
    details.includes);
addStringsToList(
    document.getElementById('matches'),
    document.querySelector('#matches ul'),
    details.matches);
addStringsToList(
    document.getElementById('excludes'),
    document.querySelector('#excludes ul'),
    details.excludes);
