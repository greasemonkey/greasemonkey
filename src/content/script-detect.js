/*
This file detects navigation events.  If a navigation points to a user script,
the installation dialog is added, inside the content page.
*/

if (document.contentType == 'text/plain'
    || document.contentType == 'application/x-javascript') {
  var userScriptUrl = document.URL;
  var userScriptContent = document.body.textContent;
  var userScriptDetails = parseUserScript(userScriptContent, userScriptUrl);

  var iframe = document.createElement('iframe');
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
}
