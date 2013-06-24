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
      !(gClipText && extractMeta(gClipText));
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
  var format = GM_util.getService().config.newScript.format;

  if (format.indexOf("%name%") >- 1) {
    var name = document.getElementById("name").value;
    if ("" != name) {
      format = format.replace("%name%", name);
    } else {
      alert(bundle.getString("newscript.noname"));
      return false;
    }
  }

  if (format.indexOf("%namespace%") >- 1) {
    var namespace = document.getElementById("namespace").value;
    if ("" != namespace) {
      format = format.replace("%namespace%", namespace);
    } else {
      alert(bundle.getString("newscript.nonamespace"));
      return false;
	}
  }

  if (format.indexOf("%description%") >- 1) {
    var description = document.getElementById("descr").value;
    if ("" != description) {
      format = format.replace("%description%", description);
    } else if (GM_util.getService().config.newScript.removeUnused) {
	  format = format.replace(/\/\/\s*@description.*\n/i, "");  // remove line;
	}
  }

  if (format.indexOf("%include%") >- 1) {
    var includes = document.getElementById("includes").value;
    if ("" != includes) {
	  includes = includes.match(/.+/g);
	  var includeFormat;
	  if ((includeFormat = format.match(/(\/\/\s*@include.*\n)/i)) && (includeFormat = includeFormat[0])) {
		var includesFormat = "";
	    for(var i = 0; i < includes.length; i++) {
		  includesFormat += includeFormat.replace("%include%", includes[i]);
		}
		format = format.replace(includeFormat, includesFormat);
	  }
	} else if (GM_util.getService().config.newScript.removeUnused) {
	  format = format.replace(/\/\/\s*@include.*\n/i, "");  // remove line;
	}
  }
  
  if (format.indexOf("%exclude%") >- 1) {
    var excludes = document.getElementById("excludes").value;
    if ("" != excludes) {
	  excludes = excludes.match(/.+/g);
	  var excludeFormat;
	  if ((excludeFormat = format.match(/(\/\/\s*@exclude.*\n)/i)) && (excludeFormat = excludeFormat[0])) {
		var excludesFormat = "";
	    for(var i = 0; i < excludes.length; i++) {
		  excludesFormat += excludeFormat.replace("%exclude%", excludes[i]);
		}
		format = format.replace(excludeFormat, excludesFormat);
	  }
	} else if (GM_util.getService().config.newScript.removeUnused) {
	  format = format.replace(/\/\/\s*@exclude.*\n/i, "");  // remove line;
	}
  }

  var excludes = document.getElementById("excludes").value;
  if ("" != excludes) {
    excludes = excludes.match(/.+/g);
    excludes = "// @exclude     " + excludes.join("\n// @exclude     ");
    //script.push(excludes);
  }

  if (window.navigator.platform.match(/^Win/)) {
    format = format.replace("\n", "\r\n");
  }

  return format;
}
