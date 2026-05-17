'use strict';
window.initrc.startAdd(async function() {
describe('bg/execute', async () => {
  before(() => sinon.stub(UserScriptRegistry, 'scriptsToRunAt'));
  after(() => UserScriptRegistry.scriptsToRunAt.restore());
  if (false === window.options_ready)
    await (async function(){ return new Promise((resolve)=>{
         setTimeout(function(){resolve()},10);
    })})();

  it('uses tabs.executeScript', () => {
    chrome.tabs.executeScript.callsArg(2);
    UserScriptRegistry.scriptsToRunAt.returns([{}]);
    executeUserscriptOnNavigation({});
    assert(chrome.tabs.executeScript.calledOnce);
  });
});
}, 3);
