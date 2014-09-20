var EXPORTED_SYMBOLS = ['registerMenuCommand', 'removeMatchingMenuCommands',
    'withAllMenuCommandsForWindowId'];

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import('resource://greasemonkey/util.js');

var gMenuCommands = [];
var gStringBundle = Services.strings.createBundle(
    "chrome://greasemonkey/locale/greasemonkey.properties");

function registerMenuCommand(
    wrappedContentWin, script,
    commandName, commandFunc, accessKey, unused, accessKey2
) {
  if (wrappedContentWin.top != wrappedContentWin) {
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
      contentWindow: wrappedContentWin,
      contentWindowId: GM_util.windowId(wrappedContentWin),
      frozen: false};
  gMenuCommands.push(command);
};

function withAllMenuCommandsForWindowId(aContentWindowId, aCallback, aForce) {
  if(!aContentWindowId && !aForce) return;

  var l = gMenuCommands.length - 1;
  for (var i = l, command = null; command = gMenuCommands[i]; i--) {
    if (aForce || command.contentWindowId == aContentWindowId) {
      aCallback(i, command);
    }
  }
};

function removeMatchingMenuCommands(aContentWindowId, aCallback, aForce) {
  withAllMenuCommandsForWindowId(aContentWindowId, function(index, command) {
    if (aCallback(index, command)) {
      gMenuCommands.splice(index, 1);
    }
  }, aForce)
}
