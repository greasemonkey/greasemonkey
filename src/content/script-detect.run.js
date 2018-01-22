/*
This file detects navigation events.  If a navigation points to a user script,
the installation dialog is opened.
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

  chrome.runtime.sendMessage({
    'name': 'OpenInstallDialog',
    'userScript': userScriptDetails,
  });

  history.back();
}

})();
