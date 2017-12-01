describe('bg/user-script-registry', () => {
  beforeEach(() => {
    indexedDB.deleteDatabase('greasemonkey');
  });

  function scriptNamed(name) {
    for (let userScript of UserScriptRegistry.scriptsToRunAt()) {
      if (userScript.name === name) return userScript;
    }
  }

  it('doMatch respects URL query string', async () => {
    let withQuery = new MatchPattern("https://example.com/test?query=*");
    assert.isOk(withQuery.doMatch(
      new URL("https://example.com/test?query=thing")));
    assert.isNotOk(withQuery.doMatch(
      new URL("https://example.com/test")));
    let noQuery = new MatchPattern("https://example.com/test");
    assert.isOk(noQuery.doMatch(
      new URL("https://example.com/test")));
    assert.isNotOk(noQuery.doMatch(
      new URL("https://example.com/test?query=thing")));
  });
});
