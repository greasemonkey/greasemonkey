This document keeps track of all the parent/child messages that Greasemonkey
passes.  All sections should look like:

    # MessageName
    Sent by: `whatever.js`

    Description of the purpose of this message, its important details, values
    within the data property and so on go here.

All message should specify `JSON.parse()`-able bodies, and always with a `name`
parameter for dispatching.  Additional values are documented per messsage name
below.

# ListUserScripts
Sent by: `browser/monkey-menu.js`, `browser/manage-user-scripts.js`

Lists all installed user scripts.  Data:

* `userScripts` An array of `.details` from `RunnableUserScript` objects.

# InstallProgress
Sent by: `bg/user-script-install.js`

While downloading a user script (and all dependencies), reports the current
progress as a percentage.  Sent specifically back to the content process
(tab / frame) which started the install.  Data:

* `errors` A (possibly empty) list of string error messages.
* `progress` A number, 0.0 to 1.0, representing the completion so far.

# UserScriptInstall
Sent by: `content/install-dialog.js`

Triggered when the install button of the install dialog is clicked by the
user.  Data:

* `details` An object of values parsed from the `==UserScript==` section,
  as produced by `parseUserScript()`.
