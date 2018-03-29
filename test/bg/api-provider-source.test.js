'use strict';
describe('bg/api-provider-source', () => {
  for (let apiName of SUPPORTED_APIS) {
    it('handles ' + apiName, () => {
      let source = apiProviderSource({'grants': [apiName]});
      assert(source.match(new RegExp(apiName + ' = ')));
    });
  }

  it('handles grant none', () => {
    let source = apiProviderSource({'grants': ['none']});
    assert(source.match(/No grants/));
  });

  it('handles no grants', () => {
    let source = apiProviderSource({'grants': []});
    assert(source.match(/No grants/));
  });
});
