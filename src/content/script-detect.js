/*
This file detects navigation events.  If a navigation points to a user script,
the installation dialog is fired.
*/

// Private implementation.
(function() {

const userScriptTypes = {
  'text/plain': 1,
  'application/ecmascript': 1,
  'application/javascript': 1,
  'application/x-javascript': 1,
  'text/ecmascript': 1,
  'text/javascript': 1,
  };

if (document.contentType in userScriptTypes) {
  var userScriptUrl = document.URL;
  var userScriptContent = document.body.textContent;
  var userScriptDetails = parseUserScript(userScriptContent, userScriptUrl);

  let installUrl = browser.runtime.getURL('src/content/install-dialog.html')
      + '?' + escape(JSON.stringify(userScriptDetails));
  location.replace(installUrl);
}

})();
