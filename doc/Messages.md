This document keeps track of all the parent/child messages that Greasemonkey
passes.  All sections should look like:

    # MessageName
    Sent by: `whatever.js`

    Description of the purpose of this message, its important details, values
    within the data property and so on go here.

All message should specify `JSON.parse()`-able bodies, and always with a `name`
parameter for dispatching.  Additional values are documented per message name
below.

# EditorSaved
Sent by: `content/edit-user-script.js`.
Received by: `bg/user-script-registry.js`.

Sent whenever the user triggers the save action in the user script editor.
Data:

* `uuid` String UUID of the script being edited.
* `content` String text content of main script.
* `requires` Object mapping require URL to text content.

# EnabledChanged
Sent by: `bg/is-enabled.js`.

Sent whenever the global enabled status changes.

* `enabled` boolean, the new status (true = enabled, false = disabled).

# EnabledQuery
Received by: `bg/is-enabled.js`.

Send with no data, responds with a boolean: the new status
(true = enabled, false = disabled).

# EnabledSet
Received by: `bg/is-enabled.js`.

Send this to set the global enabled status.

* `enabled` boolean, the new status (true = enabled, false = disabled).

# EnabledToggle
Received by: `bg/is-enabled.js`.

Send this to toggle the global enabled status.  No data.

# ListUserScripts
Received by: `bg/user-script-registry.js`.

Lists all installed user scripts.  No data is sent.  Response data:

* An array of `.details` objects from installed `RunnableUserScript`s.

# InstallProgress
Sent by: `bg/user-script-install.js`
Received by: `content/install-dialog.js`

While downloading a user script (and all dependencies), reports the current
progress as a percentage.  Sent specifically back to the content process
(tab / frame) which started the install.  Data:

* `errors` A (possibly empty) list of string error messages.
* `progress` A number, 0.0 to 1.0, representing the completion so far.

# UserScriptChanged
Sent by: `bg/user-script-registry.js`

Sent when some value (like enabled state) of a script is changed.  Data:

* `details` Updated script's current.
* `parsedDetails` Updated script's original parsed details.

# UserScriptGet
Sent by: `content/edit-user-script.js`

Data:

* `uuid` The UUID of an installed script to fetch.

Response:

* `details` The details object from an `EditableUserScript`.

# UserScriptInstall
Sent by: `content/install-dialog.js`
Received by: `bg/user-script-install.js`

Triggered when the install button of the install dialog is clicked by the
user.  Data:

* `details` An object of values parsed from the `==UserScript==` section,
  as produced by `parseUserScript()`.

# UserScriptToggleEnabled
Sent by: `content/manage-user-scripts.js`
Received by: `bg/user-script-registry.js`

Triggered when the Enable/Disable button of the manage user scripts dialog is
clicked by the user.  Data:

* `uuid` The UUID value of a script as returned by `ListUserScripts` message.

Response data: none.

# UserScriptUninstall
Sent by: `content/manage-user-scripts.js`
Received by: `bg/user-script-registry.js`

Triggered when the Remove button of the manage user scripts dialog is clicked
by the user.  Data:

* `uuid` The UUID value of a script as returned by `ListUserScripts` message.

Response data:

* `null`, but presented upon async completion.
