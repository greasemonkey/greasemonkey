'use strict';
describe('bg/api-provider-source', () => {
  for (let apiName of SUPPORTED_APIS) {
    it('handles ' + apiName, () => {
      let source = apiProviderSource({'grants': [apiName]});
      assert(!source.match(new RegExp(apiName + ' = \\(\\) => \\{ _notGranted\\("')));
      assert(source.match(new RegExp(apiName + ' = function GM_')));
      for (let otherApiName of SUPPORTED_APIS) {
        if (otherApiName == apiName) { continue; }
        assert(source.match(new RegExp(otherApiName + ' = \\(\\) => \\{ _notGranted\\("')));
        assert(!source.match(new RegExp(otherApiName + ' = function GM_')));
      }
    });
  }

  it('handles grant none', () => {
    let source = apiProviderSource({'grants': ['none']});
    for (let apiName of SUPPORTED_APIS) {
      assert(source.match(new RegExp(apiName + ' = \\(\\) => \\{ _notGranted\\("')));
      assert(!source.match(new RegExp(apiName + ' = function GM_')));
    }
  });

  it('handles no grants', () => {
    let source = apiProviderSource({'grants': []});
    for (let apiName of SUPPORTED_APIS) {
      assert(source.match(new RegExp(apiName + ' = \\(\\) => \\{ _notGranted\\("')));
      assert(!source.match(new RegExp(apiName + ' = function GM_')));
    }
  });
});
