This document keeps track of all the parent/child messages that Greasemonkey
passes.  All sections should look like:

    # MessageName
    Sent by: `whatever.js`

    Description of the purpose of this message, its important details, values
    within the data property and so on go here.

All message should specify `JSON.parse()`-able bodies, and always with a `name`
parameter for dispatching.  Additional values are documented per message name
below.

# ApiGetResourceBlob
Sent by: `content/api-provider-source.js`

Data:

* `resourceName` The name of a resource to fetch.
* `uuid` The UUID of an installed script to fetch.

Response:

Object with keys:

* `blob` The blob object.
* `mimetype`  The MIME type of the resource (from download time).
* `name` As provided in the request.
* `url` Where this resource was originally downloaded from.

# ApiDeleteValue
Sent by: `content/api-provider-source.js`

Data:

* `key` The key of a value to fetch.
* `uuid` The UUID of an installed script which stored the named value.

Response is empty, but sent upon completion.

# ApiGetValue
Sent by: `content/api-provider-source.js`

Data:

* `key` The key of a value to fetch.
* `uuid` The UUID of an installed script which stored the named value.

Response:

* `value` The previously stored value, if available.

# ApiListValues
Sent by: `content/api-provider-source.js`

Data:

* `uuid` The UUID of an installed script.

Response:

* `values` An array of strings, each the key of a stored value.

# ApiSetValue
Sent by: `content/api-provider-source.js`

Data:

* `key` The key of a value to store.
* `uuid` The UUID of an installed script which is storing this value.
* `value` The new value to store.

# EnabledChanged
Sent by: `bg/options.js`.

Sent whenever the global enabled status changes.

* `enabled` boolean, the new status (true = enabled, false = disabled).

# EnabledQuery
Received by: `bg/options.js`.

Send with no data, responds with a boolean: the new status
(true = enabled, false = disabled).

# EnabledSet
Received by: `bg/options.js`.

Send this to set the global enabled status.

* `enabled` boolean, the new status (true = enabled, false = disabled).

# EnabledToggle
Received by: `bg/options.js`.

Send this to toggle the global enabled status.  No data.

# ExportDatabase
Sent by: `browser/monkey-menu.js`
Received by: `bg/export-db.js`

Send with no data to export the entire Userscript dataset.

# ListMenuCommands
Sent by: `browser/monkey-menu.js`
Received by: `bg/on-user-script-menu-command.js`

Triggered when the popup menu is loaded.
Lists menu commands registered by the `GM.registerMenuCommand()` method called 
by user scripts on the specified tab.

Data:

* `tabId` A tab's ID (integer).

Response data:

* An array of command objects. Each object has
  - `id` A command id that can be used as HTML/XML ID.
  - `caption` A string given as the first parameter of the
    `GM.registerMenuCommand()` method.
  - `accessKey` A code point (string) or empty string given as the third
    parameter of the `GM.registerMenuCommand()` method.
  - `icon` A URL (string) of an icon which is returned by `iconUrl()` function.

# ListUserScripts
Received by: `bg/user-script-registry.js`.

Lists all installed user scripts.  Request data:

* `includeDisabled` Default false, when true also list disabled scripts.
* `stripContent` Default true, do not deliver script contents.
  (Which is faster, when this is not necessary.)

Response data:

* An array of `.details` objects from installed `EditableUserScript`s.

# MenuCommandClick
Sent by: `browser/monkey-menu.js`
Received by: `bg/on-user-script-menu-command.js`

Triggered when a command button on the popup menu is clicked by the user.
Posts message `{type: 'onclick'}` to the `UserScriptMenuCommand` channel
to call a function given as the second parameter of the
`GM.registerMenuCommand()` method.

Data:

* `id` The command id (string) as returned by `ListMenuCommands` message.

Response data:

* `undefined`

# OptionsLoad
Sent by: `browser/monkey-menu.js`
Received by: `bg/options.js`

Returns previously saved options data.  Result is the same format as
`OptionsSave`'s request.

* `excludes` A string, one `@exclude` pattern per line.

# OptionsSave
Sent by: `browser/monkey-menu.js`
Received by: `bg/options.js`

Passes the user's option values from content to background for persistence.
Request data:

* `excludes` A string, one `@exclude` pattern per line.

# SyncViaWebdavChangeOption
Sent by: `browser/monkey-menu.js`
Received by: `bg/sync-via-webdav.js`

Triggered when "Sync via WebDAV" options on the popup menu is changed by the user.
Enables, Disabled, or Reenables the sync.

Data:

Either of the following

* `enabled` boolean, the new status (true = enabled, false = disabled).
* `url` string, WebDAV directory URL.

If neither is specified, just gets "Sync via WebDAV" options.

Response data:

Ppresented upon async completion.

* `enabled` boolean, the new status (true = enabled, false = disabled).
* `url` string, WebDAV directory URL.

# UserScriptGet
Sent by: `content/edit-user-script.js`

Data:

* `uuid` The UUID of an installed script to fetch.

Response:

* `details` The details object from an `EditableUserScript`.

# UserScriptInstall
Sent by: `downloader.js`
Received by: `bg/user-script-registry.js`

Triggered when the install button of the install dialog is clicked by the
user.  Data:

* `details` An object of values parsed from the `==UserScript==` section,
  as produced by `parseUserScript()`.
* `source` A string, the entire source of the script.  Will fail if it
  references any remote resources.

Callers should specify one or the other, not both.

# UserScriptMenuCommand
Sent by: `content/api-provider-source.js`
Received by: `bg/on-user-script-menu-command.js`

This is a channel (not a message).
Triggered when the `GM.registerMenuCommand()` method is called by an user script.

Data:

* `details` The details object specifying the command. It has
  - `caption` A string given as the first parameter of the
    `GM.registerMenuCommand()` method.
  - `accessKey` A code point (string) or empty string given as the third
    parameter of the `GM.registerMenuCommand()` method.

Response data:

* `undefined`

Messages exchanged via this channel are private to its implementation.
See sender and receiver for further detail.

# UserScriptOptionsSave
Sent by: `browser/monkey-menu.js`
Received by: `bg/user-script-registry.js`

Triggered when closing the user script options view.  Data:

* `details` An object of values describing the script in question.
  Must include `uuid`.

# UserScriptToggleAutoUpdate
Sent by: `content/manage-user-scripts.js`
Received by: `bg/user-script-registry.js`

Triggered when the "Auto Update" monkey menu item is clicked by the user.
Data:

* `uuid` The UUID value of a script (as returned by `ListUserScripts` message).

Response data:

* `autoUpdate` The new resulting value of this script's state.

# UserScriptToggleEnabled
Sent by: `content/manage-user-scripts.js`
Received by: `bg/user-script-registry.js`

Triggered when the Enable/Disable monkey menu item is clicked by the user.
Data:

* `uuid` The UUID value of a script (as returned by `ListUserScripts` message).

Response data:

* `enabled` The new resulting value of this script's state.

# UserScriptUninstall
Sent by: `content/manage-user-scripts.js`
Received by: `bg/user-script-registry.js`

Triggered when the Remove button of the manage user scripts dialog is clicked
by the user.  Data:

* `uuid` The UUID value of a script as returned by `ListUserScripts` message.

Response data:

* `null`, but presented upon async completion.

# UserScriptUpdateNow
Sent by: `browser/monkey-menu.js`
Received by: `bg/updater.js`

Triggered when the "Update Now" button of the manage user scripts dialog is
clicked by the user.
Data:

* `uuid` The UUID value of a script as returned by `ListUserScripts` message.

Response data, an object with keys:

* `result` A String, one of:
  * `error` An unexpected error occurred.
  * `ignore` The request was ignored; e.g. the script was uninstalled since the
    update check was scheduled.
  * `noupdate` The update check was successful, but there was no new version.
  * `updated` The update check was successful, and there was a new version.
* `details` If the result is `updated`, the script details of the newly
  installed version.
* `message` If the result is `error`, a message describing the failure.

# UserScriptXhr
Sent by: `content/api-provider-source.js`
Received by: `bg/on-user-script-xhr.js`

This is a channel (not a message).
Triggered when the `GM.xmlHttpRequest()` method is called by a user script.
Data:

* `details` The details object specifying the request.

Response data:

* `null`

Messages exchanged via this channel are private to its implementation.
See sender and receiver for further detail.
