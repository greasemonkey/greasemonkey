describe('third-party/MatchPattern', () => {
    describe('invalid patterns', () => {
      const newPattern =
        pattern => { return () => new MatchPattern(pattern) };

      it('http://www.google.com', () => {
        // No path provided
        expect(newPattern('http://www.google.com'))
          .to.throw('@match: Could not parse the pattern.');
      });

      it('http://*foo/bar', () => {
        // '*' in the host can only be follwed by a '.' or '/'
        expect(newPattern('http://*foo/bar'))
          .to.throw('@match: Invalid host specified.');
      });

      it('http://foo.*.bar/baz', () => {
        // '*' in the host must be the first character
        expect(newPattern('http://foo.*.bar/baz'))
          .to.throw('@match: Invalid host specified.');
      });

      it('http:/bar.com/*', () => {
        // Missing scheme separator
        expect(newPattern('http:/bar.com/*'))
          .to.throw('@match: Could not parse the pattern.');
      });

      it('foo://*/*', () => {
        // Invalid scheme
        expect(newPattern('foo://*/*'))
          .to.throw('@match: Invalid protocol (foo:) specified.');
      });
  });

  describe('doMatch()', () => {
    // Patterns used in these functions should be considered 'valid' patterns.
    // If they fail on construction of the MatchPattern object, then that is
    // considered an error.

    const matches
        = (pattern, urlStr) => assert.isOk(pattern.doMatch(new URL(urlStr)));
    const notMatches
        = (pattern, urlStr) => assert.isNotOk(pattern.doMatch(new URL(urlStr)));

    describe('any http: using the http scheme', () => {
      var pattern;
      before(() => pattern = new MatchPattern('http://*/*'));

      it('matches http://www.google.com/', () => {
        matches(pattern, 'http://www.google.com/');
      });

      it('matches http://example.org/foo/bar.html', () => {
        matches(pattern, 'http://example.org/foo/bar.html');
      });
    })

    describe('any http: with any host with path /foo*', () => {
      var pattern;
      before(() => pattern = new MatchPattern('http://*/foo*'));

      it('matches http://example.org/foo/bar.html', () => {
        matches(pattern, 'http://example.org/foo/bar.html');
      });

      it('matches http://www.google.com/foo', () => {
        matches(pattern, 'http://www.google.com/foo');
      });

      it('not matches http://www.google.com/baz', () => {
        notMatches(pattern, 'http://www.google.com/baz');
      });
    });

    describe('any https: (sub)domain of google.com', () => {
      var pattern;
      before(() => pattern = new MatchPattern('https://*.google.com/'));

      it('matches https://google.com/', () => {
        matches(pattern, 'https://google.com/');
        matches(pattern, 'https://google.com');
      });

      it('matches https://www.google.com', () => {
        matches(pattern, 'https://www.google.com');
      });

      it('matches https://docs.google.com/', () => {
        matches(pattern, 'https://docs.google.com/');
      });

      it('not matches http://google.com', () => {
        notMatches(pattern, 'http://google.com');
      });
    });

    describe('any http: with path /foo*bar', () => {
      var pattern;
      before(() => pattern = new MatchPattern('http://*/foo*bar'));

      it('matches http://www.google.com/foo/baz/bar', () => {
        matches(pattern, 'http://www.google.com/foo/baz/bar');
      });

      it('matches http://example.org/foobar', () => {
        matches(pattern, 'http://example.org/foobar');
      });

      it('not matches http://example.org/foo/baz/bar.html', () => {
        notMatches(pattern, 'http://example.org/foo/baz/bar.html');
      });
    });

    describe('exact url http://example.org/foo/bar.htm', () => {
      var pattern;
      before(() => pattern = new MatchPattern('http://example.org/foo/bar.htm'));

      it('matches http://example.org/foo/bar.htm', () => {
        matches(pattern, 'http://example.org/foo/bar.htm');
      });

      it('not matches http://example.org/foo/bar.html', () => {
        notMatches(pattern, 'http://example.org/foo/bar.html');
      });
    });

    describe('any file: with path foo*', () => {
      var pattern;
      before(() => pattern = new MatchPattern('file:///foo*'));

      it('matches file:///foo/bar.html', () => {
        matches(pattern, 'file:///foo/bar.html');
      });

      it('matches file:///foo', () => {
        matches(pattern, 'file:///foo');
      });

      it('not matches file:///bar/foo', () => {
        notMatches(pattern, 'file:///bar/foo');
      });
    });

    describe('any http: on domain example.org', () => {
      var pattern;
      before(() => pattern = new MatchPattern('http://example.org/*'));

      it('matches http://example.org/foo', () => {
        matches(pattern, 'http://example.org/foo');
      });

      it('not matches http://www.example.org/foo', () => {
        notMatches(pattern, 'http://www.example.org/foo');
      });
    });

    describe('any http: on domain 127.0.0.1', () => {
      var pattern;
      before(() => pattern = new MatchPattern('http://127.0.0.1/*'));

      it('matches http://127.0.0.1', () => {
        matches(pattern, 'http://127.0.0.1');
      });

      it('matches http://127.0.0.1/foo/bar.html', () => {
        matches(pattern, 'http://127.0.0.1/foo/bar.html');
      });

      it('not matches http://127.0.0.2/', () => {
        notMatches(pattern, 'http://127.0.0.2/');
      });
    });

    describe('wildcard protocol on domain mail.google.com', () => {
      var pattern;
      before(() => pattern = new MatchPattern('*://mail.google.com/*'));

      it('matches http://mail.google.com/foo/baz/bar', () => {
        matches(pattern, 'http://mail.google.com/foo/baz/bar');
      });

      it('matches https://mail.google.com/foo/baz/bar', () => {
        matches(pattern, 'https://mail.google.com/foo/baz/bar');
      });

      it('not matches file://mail.google.com/foo/baz/bar', () => {
        notMatches(pattern, 'file://mail.google.com/foo/baz/bar');
      });

      it('not matches file:///mail.google.com/foo/baz/bar', () => {
        notMatches(pattern, 'file:///mail.google.com/foo/baz/bar');
      });
    });

    it('works when query string is present', async () => {
      let pattern = new MatchPattern('https://example.com/test?query=*');
      notMatches(pattern, 'https://example.com/test');
      matches(pattern, 'https://example.com/test?query=thing');
    });

    it('works when query string is not present', async () => {
      let pattern = new MatchPattern('https://example.com/test');
      matches(pattern, 'https://example.com/test');
      notMatches(pattern, 'https://example.com/test?query=thing');
    });

    it('works with ports in the URL', () => {
      let pattern = new MatchPattern('http://example.net/*');
      matches(pattern, 'http://example.net/');
      notMatches(pattern, 'http://otherexample.net/');
      matches(pattern, 'http://example.net:1234/');
    });

    it('works with subdomains and ports in the URL', () => {
      let pattern = new MatchPattern('http://*.example.net/*');
      matches(pattern, 'http://sub.example.net/');
      matches(pattern, 'http://sub.sub.example.net/');
      notMatches(pattern, 'http://sub.otherexample.net/');
      matches(pattern, 'http://sub.example.net:1234/');
    });
  });
});
