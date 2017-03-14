This document keeps track of all the parent/child messages that Greasemonkey
passes.  All sections should look like:

    # MessageName
    Sent by: `whatever.js`

    Description of the purpose of this message, its important details, values
    within the data property and so on go here.

All message should specify `JSON.parse()`-able bodies, and always with a `name`
parameter for dispatching.  Additional values are documented per messsage name
below.

# UserScriptInstallation
Sent by: `content/content-install-dialog.js`

Triggered when the install button of the install dialog is clicked by the
user.  Data:

* `details` An object of values parsed from the `==UserScript==` section,
  as produced by `parseUserScript()`.
