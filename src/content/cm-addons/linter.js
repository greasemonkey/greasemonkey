CodeMirror.registerHelper('lint', 'javascript', function (text, options) {
  let messages = [];
  let meta = extractMeta(text).split('\n');
  for (let [i, metaLine] of meta.entries()) {
    try {
      let s = metaLine.trim();
      if (s) window.parseMetaLine(s);
    } catch (e) {
      messages.push({
        severity: 'warning',
        from: CodeMirror.Pos(i, e.location.start.column - 1),
        to: CodeMirror.Pos(i, e.location.end.column - 1),
        message: e.message
      });
    }
  }
  return messages;
});
