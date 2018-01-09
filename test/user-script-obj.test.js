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
    let userScript;
    const matches = urlStr => assert.isOk(userScript.runsAt(new URL(urlStr)));
    const notMatches =
        urlStr => assert.isNotOk(userScript.runsAt(new URL(urlStr)));

    beforeEach(() => {
      userScript = new RemoteUserScript({});
    });

    describe('@include, general', () => {
      const url = 'http://example.org/path?query';

      it('* matches http', () => {
        userScript._includes = ['*'];
        matches(url);
      });

      it('* matches file', () => {
        userScript._includes = ['file:///*'];
        matches('file:///tmp/anything.html');
      });

      it('path * matches', () => {
        userScript._includes = ['http://example.org/*'];
        matches(url);
      });

      it('different domain does not match', () => {
        userScript._includes = ['http://example.net/*'];
        notMatches(url);
      });
    });

    describe('@match, general', () => {
      const url = 'http://example.org/';

      it('fails gracefully with a non-MatchPattern object', () => {
        userScript._matches = [{}];
        notMatches(url);
      });

      it('works with MatchPattern object', () => {
        userScript._matches = [new MatchPattern('http://*/*')];
        matches(url);
      });

      it('works with string pattern source', () => {
        userScript._matches = ['http://*/*'];
        matches(url);
      });
    });

    describe('@match, protocol', () => {
      it('matches http:', () => {
        userScript._matches = ['http://*/*'];
        matches('http://example.org');
      });

      it('matches https:', () => {
        userScript._matches = ['https://*/*'];
        matches('https://example.org');
      });

      it('matches file:', () => {
        userScript._includes = ['file:///*'];
        matches('file:///foo/bar');
      });
    });
  });
});
