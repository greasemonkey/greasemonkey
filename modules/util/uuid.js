const EXPORTED_SYMBOLS = ['uuid'];

const uuidGenerator = Components
    .classes["@mozilla.org/uuid-generator;1"]
    .getService(Components.interfaces.nsIUUIDGenerator);

function uuid(msg) {
  var uuid = uuidGenerator.generateUUID().toString();
  return uuid.substring(1,uuid.length-1);
}
