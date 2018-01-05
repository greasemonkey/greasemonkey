describe('user-script-obj', () => {
  describe('EditableUserScript.calculateEvalContent()', () => {
    let scriptContent = `
// ==UserScript==
// @name Origin
// ==/UserScript==
function gt_one(n) { return n > 1; }
gt_one(2);
`;

    it('does not fail on end of file line comment', () => {
      let lineCommentContent = scriptContent + '// EOF Comment';
      let userScript = new EditableUserScript({'content': lineCommentContent});
      userScript.calculateEvalContent();

      chai.expect(() => eval(userScript._evalContent))
          .to.not.throw("expected expression, got ')'");
    });

    it('does not fail on end of file block comment', () => {
      let blockCommentContent = scriptContent + '/* Block'
      let userScript = new EditableUserScript({'content': blockCommentContent});
      userScript.calculateEvalContent();

      chai.expect(() => eval(userScript._evalContent))
          .to.not.throw("expected expression, got ')'");
    });
  });

  describe('RemoteUserScript.runsAt()', () => {
    let userScript = new RemoteUserScript({});
    let url = new URL('http://example.org/');

    it('fails gracefully with a non-MatchPattern object', () => {
      userScript._matches = [{}];
      let result = userScript.runsAt(url);
      assert.equal(result, false);
    });

    it('works with MatchPattern object', () => {
      userScript._matches = [new MatchPattern('http://*/*')];
      let result = userScript.runsAt(url);
      assert.equal(result, true);
    });

    it('works with string pattern source', () => {
      userScript._matches = ['http://*/*'];
      let result = userScript.runsAt(url);
      assert.equal(result, true);
    });
  });
});
