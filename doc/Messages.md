This document keeps track of all the parent/child messages that Greasemonkey
passes.  All sections should look like:

    # MessageName
    Sent by: `whatever.js`

    Description of the purpose of this message, its important details, values
    within the data property and so on go here.

All message should specify `JSON.parse()`-able bodies, and always with a `name`
parameter for dispatching.  Additional values are documented per messsage name
below.

# UserScriptNavigation
Sent by: `content/content-script-install.js`

The `script-install.js` content script detected navigation to a user script.
This message is passed to the background script so that it can attach a
page action to install this script.  Data:

* `details` An object of values parsed from the `==UserScript==` section.
  TODO: Document this object somewhere.  Link to `UserScript`?
