Components.utils.import('resource://greasemonkey/parseScript.js');
Components.utils.import('resource://greasemonkey/prefmanager.js');
Components.utils.import('resource://greasemonkey/util.js');

/////////////////////////////// global variables ///////////////////////////////

const gClipboard = Components.classes["@mozilla.org/widget/clipboard;1"]
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
    document.getElementById("includes").value =
      content.selectedBrowser.contentWindow.location.href;
  }

  gClipText = getClipText()
  document.documentElement.getButton('extra2').collapsed =
      !(clipText && extractMeta(clipText));
}, false);

function doInstall() {
  var scriptSrc = createScriptSource();
  if (!scriptSrc) return false;
  var config = GM_util.getService().config;

  // Create a script object with parsed metadata, and ...
  var scope = {};
  Components.utils.import('resource://greasemonkey/parseScript.js', scope);
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
  var script = ["// ==UserScript=="];

  var name = document.getElementById("name").value;
  if ("" == name) {
    alert(bundle.getString("newscript.noname"));
    return false;
  } else {
    script.push("// @name        " + name);
  }

  var namespace = document.getElementById("namespace").value;
  if ("" == namespace) {
    alert(bundle.getString("newscript.nonamespace"));
    return false;
  } else {
    script.push("// @namespace   " + namespace);
  }

  var descr = document.getElementById("descr").value;
  if ("" != descr) {
    script.push("// @description " + descr);
  }

  var includes = document.getElementById("includes").value;
  if ("" != includes) {
    includes = includes.match(/.+/g);
    includes = "// @include     " + includes.join("\n// @include     ");
    script.push(includes);
  }

  var excludes = document.getElementById("excludes").value;
  if ("" != excludes) {
    excludes = excludes.match(/.+/g);
    excludes = "// @exclude     " + excludes.join("\n// @exclude     ");
    script.push(excludes);
  }

  script.push("// @version     1");
  script.push("// ==/UserScript==");

  var ending = "\n";
  if (window.navigator.platform.match(/^Win/)) ending = "\r\n";
  script = script.join(ending);

  return script;
}
