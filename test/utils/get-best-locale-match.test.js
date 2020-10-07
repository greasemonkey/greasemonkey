'use strict';
describe('get-best-locale-match', () => {
  describe('getBestLocaleMatch()', () => {
    it('language match', () => {
      assert.equal(getBestLocaleMatch('de', ['de', 'fr']), 'de');
    });

    it('language do not match', () => {
      assert.isNull(getBestLocaleMatch('de', ['fr']));
    });
    
    it('both language and other subtag match', () => {
      assert.equal(getBestLocaleMatch('zh-Hant', ['zh', 'zh-Hant', 'zh-Hans']), 'zh-Hant');
    });
    
    it('only language matches, no other subtag', () => {
      assert.equal(getBestLocaleMatch('zh-Hant', ['zh']), 'zh');
    });
    
    it('only language matches, non-matching other subtag', () => {
      assert.equal(getBestLocaleMatch('zh', ['zh-Hant']), 'zh-Hant');
    });
    
    it('only language matches, non-matching other subtag', () => {
      assert.equal(getBestLocaleMatch('zh-Hant', ['zh-Hans']), 'zh-Hans');
    });
    
    it('only language matches, no other subtag (preference over non-matching other subtag)', () => {
      assert.equal(getBestLocaleMatch('zh-Hant', ['zh', 'zh-Hans']), 'zh');
    });
    
    it('case-insensitive', () => {
      assert.equal(getBestLocaleMatch('zh-Hant', ['zh', 'zh-hant']), 'zh-hant');
    });
  });
});
