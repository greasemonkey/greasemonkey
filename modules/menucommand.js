var EXPORTED_SYMBOLS = ['registerMenuCommand'];

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import('resource://greasemonkey/util.js');

var gMenuCommands = [];
var gStringBundle = Services.strings.createBundle(
    "chrome://greasemonkey/locale/greasemonkey.properties");

function registerMenuCommand(
    scriptRunner,
    commandName, commandFunc, accessKey, unused, accessKey2
) {
  if (scriptRunner.window.top != scriptRunner.window) {
    // Only register menu commands for the top level window.
    return;
  }

  // Legacy support: if all five parameters were specified, (from when two
  // were for accelerators) use the last one as the access key.
  if ('undefined' != typeof accessKey2) {
    accessKey = accessKey2;
  }

  if (accessKey
      && (("string" != typeof accessKey) || (accessKey.length != 1))
  ) {
    throw new Error(
        gStringBundle.GetStringFromName('error.menu-invalid-accesskey')
            .replace('%1', commandName)
        );
  }

  var command = {
    name: commandName,
    accessKey: accessKey,
    commandFunc: commandFunc,
    contentWindowId: scriptRunner.windowId,
    frozen: false
  };

  scriptRunner.registeredMenuCommand(command);
};
