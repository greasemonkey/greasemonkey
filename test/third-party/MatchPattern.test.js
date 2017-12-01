describe('third-party/MatchPattern', () => {
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
