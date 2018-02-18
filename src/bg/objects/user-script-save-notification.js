/* Class for wrapping onClick and onClose notification listeners for updating
 * and installing userscripts */

class ScriptSaveNotification {
  constructor(uuid, notificationId) {
    this.uuid = uuid;
    this.id = notificationId;

    // Create binded functions
    this.bindClicked = this.clicked.bind(this);
    this.bindClosed = this.closed.bind(this);

    chrome.notifications.onClicked.addListener(this.bindClicked);
    chrome.notifications.onClosed.addListener(this.bindClosed);
  }

  clicked(notificationId) {
    if (notificationId == this.id) {
      // Open up the editor
      chrome.tabs.create({
        'active': true,
        'url':
          chrome.runtime.getURL('src/content/edit-user-script.html')
          + '#' + this.uuid,
      });
    }
  }

  closed(notificationId) {
    if (notificationId == this.id) {
      // Remove  the listeners
      chrome.notifications.onClicked.removeListener(this.bindClicked);
      chrome.notifications.onClosed.removeListener(this.bindClosed);
    }
  }
}
