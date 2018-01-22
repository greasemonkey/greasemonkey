/*
This file is responsible for opening the dialog for user script installation.
*/

function onOpenInstallDialog(message, sender, sendResponse) {
  // TODO: Compatibility with Firefox for Android, which does not have the
  // "windows" API.
  chrome.windows.create({
    'height': 640,
    'titlePreface': message.userScript.name + ' - Greasemonkey User Script',
    'type': 'popup',
    'url': chrome.runtime.getURL('src/content/install-dialog.html')
        + '?' + escape(JSON.stringify(message.userScript)),
    'width': 480,
  });
}
