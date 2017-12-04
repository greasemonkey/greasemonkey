describe('third-party/MatchPattern', () => {
  const matches
      = (pattern, urlStr) => assert.isOk(pattern.doMatch(new URL(urlStr)));
  const notMatches
      = (pattern, urlStr) => assert.isNotOk(pattern.doMatch(new URL(urlStr)));

  describe('doMatch()', () => {
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
