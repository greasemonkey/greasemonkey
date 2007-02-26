
// Converts a pattern in this programs simple notation to a regular expression.
// thanks AdBlock! http://www.mozdev.org/source/browse/adblock/adblock/
function convert2RegExp( pattern ) {
  s = new String(pattern);
  res = new String("^");

  for (var i = 0 ; i < s.length ; i++) {
    switch(s[i]) {
      case '*' :
        res += ".*";
        break;

      case '.' :
      case '?' :
      case '^' :
      case '$' :
      case '+' :
      case '{' :
      case '[' :
      case '|' :
      case '(' :
      case ')' :
      case ']' :
        res += "\\" + s[i];
        break;

      case '\\' :
        res += "\\\\";
        break;

      case ' ' :
        // Remove spaces from URLs.
        break;

      default :
        res += s[i];
        break;
    }
  }

  var tldRegExp = new RegExp("^(\\^(?:[^/]*)(?://)?(?:[^/]*))(\\\\\\.tld)((?:/.*)?)$")
  var tldRes = res.match(tldRegExp);
  if (tldRes) {
    // build the mighty TLD RegExp
    var tldStr =