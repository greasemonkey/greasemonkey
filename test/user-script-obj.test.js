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

    describe('@include, .tld', () => {
      it('matches .tld against .com', () => {
        userScript._includes = ['http://example.tld/*'];
        matches('http://example.com/');
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

  describe('RunnableUserScript.uuid', () => {
    describe('is set into a valid version 4 UUID', () => {
      afterEach(() => {
        window.crypto.getRandomValues.restore();
      });

      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random#Getting_a_random_integer_between_two_values_inclusive
      function getRandomIntInclusive(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive
      }

      const testData = {
        'if `window.crypto.getRandomValues()` sets an array of the number which is all 0x00.': uInt8Array => {
          uInt8Array.fill(0x00);
        },
        'if `window.crypto.getRandomValues()` sets an array of the number which is all 0xFF.': uInt8Array => {
          uInt8Array.fill(0xFF);
        },
        'if `window.crypto.getRandomValues()` sets an array of the number which is all 0x00 to 0x0F.': uInt8Array => {
          for (let i = 0; i < 16; i++) {
            uInt8Array[i] = getRandomIntInclusive(0x00, 0x0F);
          }
        },
        'if `window.crypto.getRandomValues()` sets an array of the number which is all 0x10 to 0xFF.': uInt8Array => {
          for (let i = 0; i < 16; i++) {
            uInt8Array[i] = getRandomIntInclusive(0x10, 0xFF);
          }
        },
        'if `window.crypto.getRandomValues()` sets an array of the number that the first half is 0x00 to 0x0F and the latter half is 0x10 to 0xFF.': uInt8Array => {
          for (let i = 0; i < 8; i++) {
            uInt8Array[i] = getRandomIntInclusive(0x00, 0x0F);
          }
          for (let i = 8; i < 16; i++) {
            uInt8Array[i] = getRandomIntInclusive(0x10, 0xFF);
          }
        },
        'if `window.crypto.getRandomValues()` sets an array of the number that the first half is 0x10 to 0xFF and the latter half is 0x00 to 0x0F.': uInt8Array => {
          for (let i = 0; i < 8; i++) {
            uInt8Array[i] = getRandomIntInclusive(0x10, 0xFF);
          }
          for (let i = 8; i < 16; i++) {
            uInt8Array[i] = getRandomIntInclusive(0x00, 0x0F);
          }
        },
      };

      for (const message in testData) {
        it(message, () => {
          sinon.stub(window.crypto, 'getRandomValues').callsFake(testData[message]);

          assert.match(
              new RunnableUserScript({}).uuid,
              /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
          );
        });
      }
    });
  });
});
