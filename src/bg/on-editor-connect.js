/*
This file is responsible for communicating with the GM built in editor.
*/

// Private implementation.
(function() {

function onEditorConnect(port) {
  if (port.name != 'EditorConnect') return;

  port.onMessage.addListener(msg => {
    switch (msg.type) {
      case 'open':
        open(msg.uuid, port);
        break;
      case 'save':
        save(msg.uuid, msg, port);
        break;
      default:
        console.warn('EditorConnect port un-handled message type:', msg.type);
    }
  });
}
chrome.runtime.onConnect.addListener(onEditorConnect);


function open(uuid, port) {
  let scriptDetails = UserScriptRegistry.getScript(uuid);
  if (scriptDetails) {
    scriptDetails = scriptDetails.details;
  }

  port.postMessage({
    'type': 'userscript',
    'details': scriptDetails,
  });
}


async function save(uuid, msg, port) {
  let script = await UserScriptRegistry.scriptEditorSave(uuid, msg);
  port.postMessage({
    'type': 'change',
    'details': script.details,
    'parsedDetails': script.parsedDetails,
  });
}

})();
