let details = JSON.parse(unescape(document.location.search.substr(1)));

let btnCancel = document.getElementById('btn-cancel');
btnCancel.addEventListener('click', event => window.close(), true);

let btnInstall = document.getElementById('btn-install');
btnInstall.addEventListener('click', event => {
  console.log('TODO: install this script', details.downloadUrl);
  window.close();  // Switch to/reveal progress instead?
}, true);


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
