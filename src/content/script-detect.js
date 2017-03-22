/*
This file detects navigation events.  If a navigation points to a user script,
the installation dialog is added, inside the content page.
*/

// Private implementation.
(function() {

const userScriptTypes = {
  'text/plain': 1,
  'application/x-javascript': 1
  };

if (document.contentType in userScriptTypes) {
  var userScriptUrl = document.URL;
  var userScriptContent = document.body.textContent;
  var userScriptDetails = parseUserScript(userScriptContent, userScriptUrl);

  // For development: in case of reloading the extension, the old injected
  // iframe is still left around.  If so, clean it out.
  let oldIframe = document.querySelector('iframe');
  if (oldIframe) oldIframe.parentNode.removeChild(oldIframe);

  let iframe = document.createElement('iframe');
  iframe.frameborder = 0;
  iframe.src = browser.extension.getURL('src/content/install-dialog.html')
      + '?' + escape(JSON.stringify(userScriptDetails));
  iframe.style = `
      border: none;
      border-right: 1px solid rgba(0, 0, 0, 0.15);
      height: 100%;
      left: 0;
      width: 22em;
      position: fixed;
      top: 0;
      `;
  document.body.style.marginLeft = '23em';
  document.body.appendChild(iframe);

  // Idea: Automatically linkify `@require` and `@resource` URLs, for review?
  // Idea: Colorize source?
}

})();
