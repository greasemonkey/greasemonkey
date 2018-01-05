
describe('content/cm-addons/lint-metadata', () => {
  function meta(strs, ...exprs) {
    let lines = '';
    if (exprs.length) {
      let n = strs.length - 1;
      for (let i = 0; i < n; i++) {
        lines += strs[i] + exprs[i];
      }
      lines += strs[n];
    } else {
      lines += strs[0];
    }
    return '// ==UserScript==\n' + lines + '\n// ==/UserScript==';
  }

  it('reports end of input after @', () => {
    let result = lintMetadata(meta`// @${''}`)[0];
    chai.expect(result.message).to.have.string('end of input');
    assert.equal(result.from.ch, 4);
  });

  it('reports end of input after @ before whitespace', () => {
    let result = lintMetadata(meta`// @${'  '}`)[0];
    chai.expect(result.message).to.have.string('end of input');
    assert.equal(result.from.ch, 4);
    assert.equal(result.to.ch, 4);
  });

  it('reports whole key', () => {
    let result = lintMetadata(meta`// @${'license'}`)[0];
    chai.expect(result.message).to.have.string('"license" found');
  });

  it('reports whole key beginning with dot', () => {
    let result = lintMetadata(meta`// @${'.license'}`)[0];
    chai.expect(result.message).to.have.string('".license" found');
  });

  it('reports empty key', () => {
    let result = lintMetadata(meta`// @${'  license'}`)[0];
    chai.expect(result.message).to.have.string('"" found');
  });
});
