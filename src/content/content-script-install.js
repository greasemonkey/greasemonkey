/*
This file detects navigation events.  If a navigation points to a user script,
a page action is added to allow installation.  The page action ...
*/

if (document.contentType == 'text/plain'
  || document.contentType == 'application/x-javascript') {
  var userScriptUrl = document.URL;
  var userScriptContent = document.body.textContent;
  var userScript = parseUserScript(userScriptContent, userScriptUrl);

  browser.runtime.sendMessage({
    'name': 'UserScriptNavigation',
    'details': userScript.details
  });

  // Idea: Automatically linkify `@require` and `@resource` URLs, for review?
}
