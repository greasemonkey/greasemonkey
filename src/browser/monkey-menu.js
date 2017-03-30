(function() {

const defaultIcon = browser.extension.getURL('skin/userscript.png');

console.log('send');
browser.runtime.sendMessage({'name': 'ListUserScripts'})
    .then(userScripts => {
      console.log('recv');
      let containerEl = document.querySelector('#user-scripts');
      for (let oldEl of containerEl.querySelectorAll('.user-script')) {
        oldEl.parentNode.removeChild(oldEl);
      }

      userScripts.sort((a, b) => a.name.localeCompare(b.name));

      let empty = true;
      let tplEl = document.querySelector('#templates .user-script > div');
      for (let userScript of userScripts) {
        empty = false;
        let menuEl = tplEl.cloneNode(true);

        if (!userScript.enabled) menuEl.classList.append('disabled');

        let icon = document.createElement('img');
        icon.src = userScript.icon ? userScript.icon : defaultIcon;
        menuEl.querySelector('.icon').appendChild(icon);

        menuEl.querySelector('.name').textContent = userScript.name;
        containerEl.appendChild(menuEl);
      }

      containerEl.style.display = empty ? 'none' : '';
    });


window.addEventListener('click', function(event) {
  let el = event.target;
  console.log('saw click on', el);

  while (el && !el.classList.contains('panel-list-item')) {
    el = el.parentNode;
  }

  if (el.hasAttribute('data')) {
    browser.tabs.create({
      'active': true,
      'url': el.getAttribute('data')
    });
    window.close();
  }
}, true);

})();
