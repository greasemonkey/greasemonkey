describe('user-script-obj', () => {

  describe('EditableUserScript.calculateEvalContent', () => {
    let script_content = `
// ==UserScript==
// @name Origin
// ==/UserScript==
function gt_one(n) { return n > 1; }
gt_one(2);
`
    it('does not fail on end of file line comment', () => {
      let line_comment_content = script_content + '// EOF Comment';
      let user_script = new EditableUserScript({'content': line_comment_content});
      user_script.calculateEvalContent();

      chai.expect(() => eval(user_script._evalContent))
          .to.not.throw("expected expression, got ')'");
    });

    it('does not fail on end of file block comment', () => {
      let block_comment_content = script_content + '/* Block'
      let user_script = new EditableUserScript({'content': block_comment_content});
      user_script.calculateEvalContent();

      chai.expect(() => eval(user_script._evalContent))
          .to.not.throw("expected expression, got ')'");
    });

  });

});

