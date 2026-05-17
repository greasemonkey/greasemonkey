'use strict';
window.initrc.startAdd(async function() {
describe('bg/options', async () => {
  describe('global enable bit', () => {
    // Leave GM globally enabled after these tests run.
    after(() => {
      setGlobalEnabled(true);
    });
  if (false === window.options_ready)
    await (async function(){ return new Promise((resolve)=>{
         setTimeout(function(){resolve()},10);
    })})();

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

  describe('global excludes', () => {
    it('prevents script matching', () => {
       if (false === window.options_ready)
         await (async function(){ return new Promise((resolve)=>{
            setTimeout(function(){resolve()},10);
         })})();
      window.onOptionsSave({'excludes': ''}, null, () => null);
      let userScript
          = new EditableUserScript({'includes': ['http://example.net/*']});

      assert.isTrue(userScript.runsOn(new URL('http://example.net/ruined')));
      assert.isTrue(userScript.runsOn(new URL('http://example.net/weaved')));

      window.onOptionsSave(
          {'excludes': 'http://example.net/r*'}, null, () => null);

      assert.isFalse(userScript.runsOn(new URL('http://example.net/ruined')));
      assert.isTrue(userScript.runsOn(new URL('http://example.net/weaved')));
    });
  });
});
}, 3);
