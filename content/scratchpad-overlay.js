window.addEventListener('load', function() {
  var args = window.arguments;
  if (!args) return;
  if (!(args[0] instanceof Ci.nsIDialogParamBlock)) return;
  args = args[0].GetString(1);
  if (!args) return;
  args = JSON.parse(args);
  if (!args.filename) return;
  if (!args.filename.match(/\.user\.js$/)) return;

  Components.utils.import('chrome://greasemonkey-modules/content/util.js');

  // If we're opening a user script:
  // Put the cursor at the top.  Workaround for #1708 ; remove when
  // http://bugzil.la/843597 is fixed.
  var initializeCheckCount = 0;
  var initializeCheckTimer = null;
  function moveCursorToTop() {
    if (initializeCheckCount > 50) {
      GM_util.logError('Gave up waiting for Scratchpad.initialized!');
      clearInterval(initializeCheckTimer);
    }
    initializeCheckCount++;

    if (!Scratchpad.initialized) return;

    if ('function' == typeof Scratchpad.editor.setCursor) {
      // Firefox >= 28
      Scratchpad.editor.setCursor({line: 0, ch: 0});
    } else {
      // Firefox <= 27; i.e. PaleMoon
      Scratchpad.editor.setCaretPosition(0, 0);
    }

    clearInterval(initializeCheckTimer);
  }
  initializeCheckTimer = setInterval(moveCursorToTop, 20);

  // Hide all the elements which don't make sense when editing a script.
  // See #1771 and #1774.
  function setNodeAttr(aId, aAttr, aVal) {
    var el = document.getElementById(aId);
    if (el) el.setAttribute(aAttr, aVal);
  }

  setNodeAttr('sp-execute-menu', 'collapsed', true);
  setNodeAttr('sp-environment-menu', 'collapsed', true);
  setNodeAttr('sp-toolbar-run', 'collapsed', true);
  setNodeAttr('sp-toolbar-inspect', 'collapsed', true);
  setNodeAttr('sp-toolbar-display', 'collapsed', true);

  // Plus the keyboard shortcuts for them.
  setNodeAttr('sp-key-run', 'disabled', true);
  setNodeAttr('sp-key-inspect', 'disabled', true);
  setNodeAttr('sp-key-display', 'disabled', true);
  setNodeAttr('sp-key-evalFunction', 'disabled', true);
  setNodeAttr('sp-key-reloadAndRun', 'disabled', true);

  // But the context menu items can't be accessed by ID (?!) so iterate.
  var textPopup = document.getElementById('scratchpad-text-popup');
  if (textPopup) {
    for (var i = 0, node = null; node = textPopup.childNodes[i]; i++) {
      if ('sp-text-run' == node.id) {
        node.collapsed = true;
        if (node.previousSibling.tagName.toLowerCase() == "menuseparator") {
          node.previousSibling.collapsed = true;
        }
      }
      if ('sp-text-inspect' == node.id) node.collapsed = true;
      if ('sp-text-display' == node.id) node.collapsed = true;
      if ('sp-text-evalFunction' == node.id) node.collapsed = true;
      if ('sp-text-reloadAndRun' == node.id) {
        node.collapsed = true;
        if (node.previousSibling.tagName.toLowerCase() == "menuseparator") {
          node.previousSibling.collapsed = true;
        }
      }
    }
  }
}, true);
