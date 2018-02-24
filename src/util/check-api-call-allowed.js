// This only works in the background, when UserScriptRegistry is available.

// The user script of `userScriptUuid` has a @grant for `method`, or throw.
function checkApiCallAllowed(method, userScriptUuid) {
  let userScript = UserScriptRegistry.scriptByUuid(userScriptUuid);
  if (!userScript.grants.includes(method)) {
    throw new Error(_('SCRIPT_does_not_grant_METHOD', userScript, method));
  }
}
