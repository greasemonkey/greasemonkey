function setMockIcons() {
  let icons = document.querySelectorAll('.panel .user-script .icon');
  console.log('icons?', icons);
  for (let icon of icons) {
    while (icon.firstChild) icon.removeChild(icon.firstChild);
    console.log(icon);
    let img = document.createElement('img');
    // If this were real, the name *and* icon would come from script data.
    img.src = browser.extension.getURL('skin/userscript.png');
    icon.appendChild(img);
    console.log(icon, img);
  }
}

setMockIcons();
