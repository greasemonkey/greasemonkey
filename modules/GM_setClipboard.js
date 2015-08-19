// Based on Scriptish:
// https://github.com/scriptish/scriptish/blob/master/extension/modules/api/GM_setClipboard.js

var EXPORTED_SYMBOLS = ['GM_setClipboard'];

var Cc = Components.classes;
var Ci = Components.interfaces;

var FLAVOR_TEXT = 'text/unicode';
var FLAVOR_HTML = 'text/html';

var gClipboardHelper = Cc['@mozilla.org/widget/clipboardhelper;1']
    .getService(Ci.nsIClipboardHelper);
var gClipboardService = Cc['@mozilla.org/widget/clipboard;1']
    .getService(Ci.nsIClipboard);
var gStringBundle = Cc['@mozilla.org/intl/stringbundle;1']
    .getService(Ci.nsIStringBundleService)
    .createBundle('chrome://greasemonkey/locale/greasemonkey.properties');

function GM_setClipboard(aData, aType) {
  aType = (aType || 'text').toLowerCase();

  switch (aType) {
  case 'text':
    gClipboardHelper.copyString(aData);
    break;
  case 'html':
    var trans = Cc['@mozilla.org/widget/transferable;1']
        .createInstance(Ci.nsITransferable);

    // Add text/html flavor.
    var strVal = Cc['@mozilla.org/supports-string;1']
        .createInstance(Ci.nsISupportsString);
    strVal.data = aData;
    trans.addDataFlavor(FLAVOR_HTML);
    trans.setTransferData(FLAVOR_HTML, strVal, (aData.length * 2));

    // Add a text/unicode flavor (html converted to plain text).
    strVal = Cc['@mozilla.org/supports-string;1']
        .createInstance(Ci.nsISupportsString);
    var converter = Cc['@mozilla.org/feed-textconstruct;1']
        .createInstance(Ci.nsIFeedTextConstruct);
    converter.type = aType;
    converter.text = aData;
    strVal.data = converter.plainText();
    trans.addDataFlavor(FLAVOR_TEXT);
    trans.setTransferData(FLAVOR_TEXT, strVal, (strVal.data.length * 2));

    gClipboardService.setData(trans, null, gClipboardService.kGlobalClipboard);
    break;
  default:
    throw new Error(
        gStringBundle.GetStringFromName('setClipboard.unsupportedType')
            .replace('%1', aType));
  }
}
