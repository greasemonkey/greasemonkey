function setMockIcons() {
  let icons = document.querySelectorAll('.panel .user-script .icon');
  for (let icon of icons) {
    while (icon.firstChild) icon.removeChild(icon.firstChild);
    let img = document.createElement('img');
    // If this were real, the name *and* icon would come from script data.
    img.src = browser.extension.getURL('skin/userscript.png');
    icon.appendChild(img);
  }
}

setMockIcons();

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
