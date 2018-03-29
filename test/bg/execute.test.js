'use strict';
describe('bg/execute', () => {
  before(() => sinon.stub(UserScriptRegistry, 'scriptsToRunAt'));
  after(() => UserScriptRegistry.scriptsToRunAt.restore());

  it('uses tabs.executeScript', () => {
    chrome.tabs.executeScript.callsArg(2);
    UserScriptRegistry.scriptsToRunAt.returns([{}]);
    executeUserscriptOnNavigation({});
    assert(chrome.tabs.executeScript.calledOnce);
  });
});
