This document keeps track of all the parent/child ports that Greasemonkey
creates. All sections should look like:

    # PortName
    Sent by: `creator.js`
    Received by: `listener.js`

    Description of the purpose of this port, its important details, incoming
    and outgoing message schema and expected responses. Message names are not
    necessarily included when sending message but are intended to be used as
    a labeling mechanism for the documentation.

    An additional note on identifying message direction. Incoming messages are
    sent from `creator.js` to `listener.js`. While outgoing messages are the
    reverse.

All message should specify `JSON.parse()`-able bodies, and always with a `name`
parameter for dispatching.  Additional values are documented per message name
below.

# EditorConnect
Sent by: `content/edit-user-script.js`
Received by: `bg/on-editor-connect.js`

_Incoming Messages_
**open**
Triggered when the user script editor opens.

* `uuid` The UUID of an installed script to fetch.
Expects **userscript**

**save**
Triggered when the editor is saved.

* `uuid` The UUID of the saved script.
* `content` String text content of main script.
* `requires` Object mapping require URL to text content.
Expects **change**

_Outgoing Messages_
**userscript**
Sent after estabishing the port connection.

* `details` The details object from an `EditableUserScript`.

**change**
Sent after saving the user script.

* `details` Updated script's current.
* `parsedDetails` Updated script's original parsed details.
