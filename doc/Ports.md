This document keeps track of all the parent/child ports that Greasemonkey
creates. All sections should look like:

    # PortName
    Sent by: `creator.js`
    Received by: `listener.js`

    Description of the purpose of this port, its important details, incoming
    and outgoing message schema and expected responses. Message types are not
    necessarily included when sending messages but are intended to be used as
    a labeling mechanism for the documentation.

    An additional note on identifying messsage direction. Incoming messages
    are sent from `creator.js` to `listener.js`. While outgoing messages are
    the reverse.

All messages should specify `JSON.parse()`-able bodies.

# RemoteInstallDialog
Sent by: `content/install-dialog.js`
Received by: `bg/remote-install-manager.js`

_Incoming Messages_
**connect**
Sent when the install dialog is first created. Allows the background to
associate the port with a specific `requestId`. Data:

* `requestId` The unique identifier describing the user script download
instance.

**save**
Sent when the user presses the install button on the install dialog.
Indicates that the script should be saved.

_Outgoing Messages_
**progress**
Sent as data is received from the background downloads of script resources.
Data:

* `progress` The total progress from 0.0 to 1.0.

**finish**
Sent when the user script has finished installing and the dialog can be
closed.

**error**
Sent if there is an error downloading script resources. Data:

* `errors` A list of error messages.
