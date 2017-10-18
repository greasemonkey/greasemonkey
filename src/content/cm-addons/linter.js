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
      messages.push({
        severity: 'warning',
        from: CodeMirror.Pos(metaStart + i, e.location.start.column - 1),
        to: CodeMirror.Pos(metaStart + i, e.location.end.column - 1),
        message: e.message
      });
    }
  }
  return messages;
});
