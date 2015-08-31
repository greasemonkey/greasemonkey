Components.utils.import("chrome://greasemonkey-modules/content/extractMeta.js");
Components.utils.import('chrome://greasemonkey-modules/content/parseScript.js');
Components.utils.import('chrome://greasemonkey-modules/content/prefmanager.js');
Components.utils.import('chrome://greasemonkey-modules/content/util.js');

/////////////////////////////// global variables ///////////////////////////////

var gClipboard = Components.classes["@mozilla.org/widget/clipboard;1"]
    .getService(Components.interfaces.nsIClipboard);
var gClipText = null;
var bundle = null;

////////////////////////////////// functions ///////////////////////////////////

window.addEventListener("load", function window_load() {
  // init the global string bundle
  bundle = document.getElementById("gm-browser-bundle");

  // load default namespace from pref
  document.getElementById("namespace").value =
      GM_prefRoot.getValue("newscript_namespace", "");

  // default the includes with the current page's url
  var content = window.opener.document.getElementById("content");
  if (content) {
    var callback = function (aMessage) {
      window.opener.messageManager
          .removeMessageListener("greasemonkey:newscript-load-end", callback);
      document.getElementById("include").value = aMessage.data.href;
    };

    window.opener.messageManager
        .addMessageListener("greasemonkey:newscript-load-end", callback);
    content.selectedBrowser.messageManager
        .sendAsyncMessage("greasemonkey:newscript-load-start", {});
  }

  gClipText = getClipText();
  document.documentElement.getButton('extra2').collapsed =
      !(gClipText && extractMeta(gClipText));
}, false);

function doInstall() {
  var scriptSrc = createScriptSource();
  if (!scriptSrc) return false;
  var config = GM_util.getService().config;

  // Create a script object with parsed metadata, and ...
  var scope = {};
  Components.utils.import('chrome://greasemonkey-modules/content/parseScript.js', scope);
  var script = scope.parse(scriptSrc);
  // ... make sure entered details will not ruin an existing file.
  if (config.installIsUpdate(script)) {
    var overwrite = confirm(bundle.getString("newscript.exists"));
    if (!overwrite) return false;
  }

  // finish making the script object ready to install
  // (put this created script into a file -- only way to install it)
  GM_util.installScriptFromSource(scriptSrc, function() {
    // Persist namespace value.
    GM_prefRoot.setValue("newscript_namespace", script.namespace);
    // Now that async write is complete, close the window.
    close();
  });

  return false;
}

function getClipText() {
  var clipText = '';
  try {
    var transferable = Components.classes["@mozilla.org/widget/transferable;1"]
        .createInstance(Components.interfaces.nsITransferable);
    if ('init' in transferable) transferable.init(null);
    transferable.addDataFlavor('text/unicode');
    gClipboard.getData(transferable, gClipboard.kGlobalClipboard);
    var str = new Object(), strLen = new Object();
    transferable.getTransferData('text/unicode', str, strLen);
    if (str) {
      str = str.value.QueryInterface(Components.interfaces.nsISupportsString);
      clipText = str.data.substring(0, strLen.value / 2);
    }
  } catch (e) {
    dump('Error reading clipboard:\n' + e + '\n');
  }
  return clipText;
}

function installFromClipboard() {
  GM_util.installScriptFromSource(gClipText);
}

// assemble the XUL fields into a script template
function createScriptSource() {
  var source = GM_prefRoot.getValue('newScript.template');
  var removeUnused = GM_prefRoot.getValue('newScript.removeUnused');

  function removeMetaLine(aMetaName) {
    if (!removeUnused) return;
    var re = new RegExp('^//\\s*@' + aMetaName + '.*\\n?', 'im');
    source = source.replace(re, '');
  }

  function replaceSingleVal(aMetaName, aOptional) {
    var replaceKey = '%' + aMetaName + '%';
    if (-1 == source.indexOf(replaceKey)) return;
    var replaceVal = document.getElementById(aMetaName).value;
    if (!aOptional && !replaceVal) {
      throw {
          'name': 'Metadata Value Error',
          'message': bundle.getString('newscript.no' + aMetaName),
          };
    }
    if (aOptional && !replaceVal) {
      removeMetaLine(aMetaName);
    } else {
      source = source.replace(replaceKey, replaceVal);
    }
    return true;
  }

  function replaceMultiVal(aMetaName) {
    var replaceKey = '%' + aMetaName + '%';
    if (-1 == source.indexOf(replaceKey)) return;
    var replaceVal = document.getElementById(aMetaName).value.match(/[^\s]+/g);
    if (!replaceVal || 0 == replaceVal.length) {
      removeMetaLine(aMetaName);
    } else {
      var re = new RegExp('(.+)' + replaceKey);
      var m = source.match(re);
      source = source.replace(replaceKey, replaceVal.join('\n' + m[1]));
    }
  }

  try {
    replaceSingleVal('name', false);
    replaceSingleVal('namespace', false);
    replaceSingleVal('description', true);
    replaceMultiVal('include');
    replaceMultiVal('exclude');
  } catch (e) {
    if (e.name && e.name == 'Metadata Value Error') {
      GM_util.alert(e.message);
      return false;
    } else {
      throw e;
    }
  }

  if (window.navigator.platform.match(/^Win/)) {
    source = source.replace("\n", "\r\n");
  }

  return source;
}
