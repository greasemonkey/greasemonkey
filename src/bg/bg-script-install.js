// Here we have received a message from content that a script has been
// navigated to.  Add a page action allowing potential install of this script.
// Pass the details via the URL (!).
function onUserScriptNavigation(message, sender, sendResponse) {
  var escapedDetails = escape(JSON.stringify(message.details));
  browser.pageAction.setPopup({
    'tabId': sender.tab.id,
    'popup': 'src/page/page-script-install.html?' + escapedDetails
  });

  browser.pageAction.show(sender.tab.id);
}
