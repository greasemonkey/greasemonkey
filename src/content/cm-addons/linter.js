(function () {

  const gAllMetaRegexp = new RegExp(
    '^(\u00EF\u00BB\u00BF)?// ==UserScript==([\\s\\S]*?)^// ==/UserScript==',
    'm');

  /** Get just the stuff between ==UserScript== lines. */
  function extractMeta(content) {
    var meta = content.match(gAllMetaRegexp);
    if (meta) return meta[2]; // keep empty lines because we'll need their line numbers.
    return '';
  }

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

})();
