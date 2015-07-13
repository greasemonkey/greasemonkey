var EXPORTED_SYMBOLS = [
    'MenuCommandListRequest', 'MenuCommandRespond',
    'MenuCommandRun', 'MenuCommandSandbox',
    ];


var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;


// Frame scope: Pass "list menu commands" message into sandbox as event.
function MenuCommandListRequest(aContent, aMessage) {
  var e = new aContent.CustomEvent(
      'greasemonkey-menu-command-list', {'detail': aMessage.data.cookie});
  aContent.dispatchEvent(e);
}


// Callback from script scope, pass "list menu commands" response up to
// parent process as a message.
function MenuCommandRespond(aCookie, aData) {
  var cpmm = Cc["@mozilla.org/childprocessmessagemanager;1"]
      .getService(Ci.nsIMessageSender);
  cpmm.sendAsyncMessage(
      'greasemonkey:menu-command-response',
      {'commands': aData, 'cookie': aCookie});
}


// Frame scope: Respond to the "run this menu command" message coming
// from the parent, pass it into the sandbox.
function MenuCommandRun(aContent, aMessage) {
  var e = new aContent.CustomEvent(
      'greasemonkey-menu-command-run', {'detail': aMessage.data.cookie});
  aContent.dispatchEvent(e);
}


// This function is injected into the sandbox, in a private scope wrapper, BY
// SOURCE.  Data and sensitive references are wrapped up inside its closure.
function MenuCommandSandbox(
    aScriptId, aScriptName, aCommandResponder, aFrameScope,
    aInvalidAccesskeyErrorStr) {
  // 1) Internally to this function's private scope, maintain a set of
  // registered menu commands.
  var commands = {};
  var commandCookie = 0;
  // 2) Respond to requests to list those registered commands.
  addEventListener('greasemonkey-menu-command-list', function(e) {
    aCommandResponder(e.detail, commands);
  }, true);
  // 3) Respond to requests to run those registered commands.
  addEventListener('greasemonkey-menu-command-run', function(e) {
    var command = commands[e.detail];
    if (!command) {
      throw new Error('Could not run requested menu command!');
    } else {
      command.commandFunc();
    }
  }, true);
  // 4) Export the "register a command" API function to the sandbox scope.
  this.GM_registerMenuCommand = function(
      commandName, commandFunc, accessKey, unused, accessKey2) {
    // Legacy support: if all five parameters were specified, (from when two
    // were for accelerators) use the last one as the access key.
    if ('undefined' != typeof accessKey2) {
      accessKey = accessKey2;
    }

    if (accessKey
        && (("string" != typeof accessKey) || (accessKey.length != 1))
    ) {
      throw new Error(aInvalidAccesskeyErrorStr.replace('%1', commandName));
    }

    var command = {
      cookie: ++commandCookie,
      name: commandName,
      scriptId: aScriptId,
      scriptName: aScriptName,
      accessKey: accessKey,
      commandFunc: commandFunc,
    };
    commands[command.cookie] = command;
  };
}
