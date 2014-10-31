// The frame script for Electrolysis (e10s) compatible injection.
//   See: https://developer.mozilla.org/en-US/Firefox/Multiprocess_Firefox

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;


//var gScriptRunners = {};

// \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ //

// For every frame/process, make sure the content observer is running.

Cu.import('resource://greasemonkey/contentObserver.js');

// \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ //

function ScriptRunner(aWindow, aUrl) {
  this.menuCommands = [];
  this.window = aWindow;
  this.windowId = GM_util.windowId(this.window);
  this.url = aUrl;
}


ScriptRunner.prototype.openInTab = function(aUrl, aInBackground) {
  var response = sendSyncMessage('greasemonkey:open-in-tab', {
    inBackground: aInBackground,
    url: aUrl
  });

  return response ? response[0] : null;
};


ScriptRunner.prototype.registeredMenuCommand = function(aCommand) {
  var length = this.menuCommands.push(aCommand);

  sendAsyncMessage("greasemonkey:menu-command-registered", {
    accessKey: aCommand.accessKey,
    frozen: aCommand.frozen,
    index: length - 1,
    name: aCommand.name,
    windowId: aCommand.contentWindowId
  });
};

// \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ // \\ //

/*
addEventListener("pagehide", observer.pagehide.bind(observer));
addEventListener("pageshow", observer.pageshow.bind(observer));
*/


/*
addMessageListener("greasemonkey:inject-script",
    observer.runDelayedScript.bind(observer));
addMessageListener("greasemonkey:menu-command-clicked",
    observer.runMenuCommand.bind(observer));
*/
