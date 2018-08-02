'use strict';
describe('parse-user-script', () => {
  let urlStr = 'http://www.example.com/example.user.js';

  describe('extractMeta()', () => {
    it('does not throw even when script content is null', () => {
      let result = extractMeta(null);
      assert.equal(result, '');
    });
  });

  describe('parseUserScript()', () => {
    it('fails with empty string input', () => {
      chai.expect(() => parseUserScript('', urlStr))
          .to.throw('got no content');
    });

    it('works with no download URL', () => {
      let result = parseUserScript('// Empty script.');
      assert.equal(result.name, 'Unnamed Script');  // The default.
    });

    it('uses download file name as name by default', () => {
      let result = parseUserScript(
        '// Empty script.', 'http://www.example.org/glade.user.js');
      assert.equal(result.name, 'glade');
    });

    it('uses download host as namespace by default', () => {
      let result = parseUserScript(
          '// Empty script.', 'http://www.example.org/example.user.js');
      assert.equal(result.namespace, 'www.example.org');
    });

    it('parses the @name', () => {
      let src = metaBlockFromLines('// @name Debts');
      let result = parseUserScript(src, urlStr);
      assert.equal(result.name, 'Debts');
    });

    it('parses the @homepageURL', () => {
      let src = metaBlockFromLines('// @homepageURL http://example.com/home');
      let result = parseUserScript(src, urlStr);
      assert.equal(result.homePageUrl, 'http://example.com/home');
    });
  });
});
