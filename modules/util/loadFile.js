"use strict";

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import('chrome://greasemonkey-modules/content/constants.js');
Cu.import('chrome://greasemonkey-modules/content/util.js');
Cu.importGlobalProperties(["Blob"]);

var EXPORTED_SYMBOLS = ['loadFile'];
const remote = (function() {
  if (!("@mozilla.org/xre/app-info;1" in Cc)) {
    return false;
  }
  let runtime = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULRuntime);
  return runtime.processType !== Ci.nsIXULRuntime.PROCESS_TYPE_DEFAULT;
})();

const cpmm = (function() {
  try {
    if (remote) {
      return Cc["@mozilla.org/childprocessmessagemanager;1"].
             getService(Ci.nsISyncMessageSender);
    }
  } catch (e) {
   // fall through
  }
  return null;
})();

// Loads a file (from the scripts dir), whether being run in a child content
// process or not
function loadFile(url, mime, type) {
  type = type || "";
  mime = mime || "application/octet-stream";
  if (remote) {
    let etype = type;
    switch (etype) {
      case undefined:
      case "":
      case "arraybuffer":
      case "json":
      case "text":
        break;
      case "blob":
        etype = "arraybuffer";
        break;
      default:
        // This would either throw later anyway, or actually crash the tab
        throw new Error("Unsupported type '" + type + "'");
    }
    let result = cpmm.sendSyncMessage("greasemonkey:load-file", {
      url: url,
      mime: mime,
      type: etype});
    result = result && result[0];
    if (!result.result) {
      throw new Error(result.error || "Unknown Error");
    }
    if (type === "blob") {
      result.content = new Blob([result.content], {type: mime});
    }
    return result.content;
  }
  return GM_util.fileXhr(url, mime, type);
}
