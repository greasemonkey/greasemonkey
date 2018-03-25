// For a line of the form "// @meta", "meta" is in position 4.
const META_PREFIX = '// @';
const META_POSN = META_PREFIX.length;


function lintMetadata(text, options) {
  let messages = [];
  let meta = extractMeta(text).split('\n');
  let metaStartLine = (() => {
    let m = gAllMetaRegexp.exec(text);
    if (!m) return 0;
    let prefix = text.substr(0, m.index);
    return prefix.split('\n').length;
  })();

  for (let [i, metaLine] of meta.entries()) {
    try {
      // Only consider meta lines.
      if (metaLine.substr(0, META_POSN) === META_PREFIX) {
        parseMetaLine(metaLine.trim());
      }
    } catch (e) {
      let ann = {
        'severity': 'warning',
        'from': { line: metaStartLine + i, ch: e.location.start.column - 1 },
        'to': { line: metaStartLine + i, ch: e.location.end.column - 1 },
        'message': e.message
      };
      // Turn "Expected...but 'w' found" into "Expected...but 'word' found".
      if (e.message.match(/Expected.*but.*found/) && ann.from.ch == META_POSN) {
        let m = metaLine.substr(META_POSN).match(/^([^\s]*)/);
        ann.to.ch = ann.from.ch + m[1].length;
        ann.message = ann.message.replace(/(.+")([^"]+)(".+)$/, `$1${m[1]}$3`);
      }
      messages.push(ann);
    }
  }

  return messages;
}
