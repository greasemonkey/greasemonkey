CodeMirror.registerHelper('lint', 'javascript', function (text, options) {
  let messages = [];
  let meta = extractMeta(text).split('\n');
  let metaStart = (() => {
    let m = gAllMetaRegexp.exec(text);
    if (!m) return 0;
    let prefix = text.substr(0, m.index);
    return prefix.split('\n').length;
  })();

  for (let [i, metaLine] of meta.entries()) {
    try {
      let s = metaLine.trim();

      // Ignore comments that aren't meta lines.
      if (metaLine.substr(0, 2) == '//' && metaLine.substr(0, 4) != '// @') {
        continue;
      }

      if (s) window.parseMetaLine(s);
    } catch (e) {
      let ann = {
        severity: 'warning',
        from: CodeMirror.Pos(metaStart + i, e.location.start.column - 1),
        to: CodeMirror.Pos(metaStart + i, e.location.end.column - 1),
        message: e.message
      };
      // Make "Expected...but 'f' found" more meaningful. If all characters
      // after '// @' are whitespace e.found will be null so skip this step,
      // else grab the word after '@' and insert it into the message.
      if (ann.from.ch == 4 && e.found) {
        let s = metaLine.slice(4).match(/[^\s]*/)[0];
        ann.message = ann.message.replace(/(.+")([^"]+)(".+)$/, `$1${s}$3`);
        // Force text marker to stretch the word so it's easier to hover over.
        ann.to.ch = ann.from.ch + s.length;
      }
      messages.push(ann);
    }
  }
  return messages;
});
