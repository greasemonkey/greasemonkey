describe('bg/is-enabled', () => {
  it('passes data between setGlobalEnabled() and getGlobalEnabled()', () => {
    setGlobalEnabled(true);
    assert.equal(getGlobalEnabled(), true);
    setGlobalEnabled(false);
    assert.equal(getGlobalEnabled(), false);
  });

  it('toggles enabled state', () => {
    setGlobalEnabled(true);
    assert.equal(getGlobalEnabled(), true);
    toggleGlobalEnabled();
    assert.equal(getGlobalEnabled(), false);
  });
});
