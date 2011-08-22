Components.utils.import('resource://greasemonkey/util.js');

const EXPORTED_SYMBOLS = ['windowIdForEvent'];

function windowIdForEvent(aEvent) {
  var doc = aEvent.originalTarget;
  try {
    doc.QueryInterface(Components.interfaces.nsIDOMHTMLDocument);
  } catch (e) {
    return null;
  }

  return GM_util.windowId(doc.defaultView);
}
