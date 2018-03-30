'use strict';
describe('content/cm-addons/lint-metadata', () => {
  function lintOneBadMetaLine(v) {
    let src = `// ==UserScript==\n// @${v}\n// ==/UserScript==\n`;
    return lintMetadata(src)[0];
  }

  it('reports end of input after @', () => {
    let result = lintOneBadMetaLine('');
    chai.expect(result.message).to.have.string('end of input');
    assert.equal(result.from.ch, 4);
  });

  it('reports end of input after @ before whitespace', () => {
    let result = lintOneBadMetaLine('  ');
    chai.expect(result.message).to.have.string('end of input');
    assert.equal(result.from.ch, 4);
    assert.equal(result.to.ch, 6);
  });

  it('reports whole key, with tab and value', () => {
    let result = lintOneBadMetaLine('license\tfoo');
    chai.expect(result.message).to.have.string('"license" found');
  });

  it('reports whole key', () => {
    let result = lintOneBadMetaLine('license foo');
    chai.expect(result.message).to.have.string('"license" found');
  });

  it('reports whole key beginning with dot', () => {
    let result = lintOneBadMetaLine('.license bar');
    chai.expect(result.message).to.have.string('".license" found');
  });

  it('reports empty key', () => {
    let result = lintOneBadMetaLine('  license baz');
    chai.expect(result.message).to.have.string('"  " found');
  });

  it('reports empty key, preserves key list', () => {
    let result = lintOneBadMetaLine('  license baz');
    chai.expect(result.message).to.have.string('Expected "author",');
    chai.expect(result.message).to.have.string('or "version" but');
  });
});
