/////////////////////////////// global variables ///////////////////////////////

var bundle = null;
window.addEventListener("load", function() {
  // init the global string bundle
  bundle = document.getElementById("gm-browser-bundle");

  // load default namespace from pref
  document.getElementById("namespace").value =
      GM_prefRoot.getValue("newscript_namespace", "");

  // default the includes with the current page's url
  document.getElementById("includes").value =
      window.opener.document.getElementById("content").selectedBrowser
      .contentWindow.location.href;
}, false);

////////////////////////////////// functions ///////////////////////////////////

function doInstall() {
  var script = createScriptSource();
  if (!script) return false;

  // put this created script into a file -- only way to install it
  var tempFile = getTempFile();
  var foStream = getWriteStream(tempFile);
  foStream.write(script, script.length);
  foStream.close();

  var config = GM_getConfig();

  // create a script object with parsed metadata,
  script = config.parse(script, tempFile);

  // make sure entered details will not ruin an existing file
  if (config.installIsUpdate(script)) {
    var overwrite = confirm(bundle.getString("newscript.exists"));
    if (!overwrite) return false;
  }

  // finish making the script object ready to install
  script.setDownloadedFile(tempFile);

  // install this script
  config.install(script);

  // and fire up the editor!
  openInEditor(script);

  // persist namespace value
  GM_prefRoot.setValue("newscript_namespace", script.namespace);

  return true;
};

// assemble the XUL fields into a script template
function createScriptSource() {
  var script = ["// ==UserScript=="];

  var name = document.getElementById("name").value;
  if ("" == name) {
    alert(bundle.getString("newscript.noname"));
    return false;
  } else {
    script.push("// @name           " + name);
  }

  var namespace = document.getElementById("namespace").value;
  if ("" == namespace) {
    alert(bundle.getString("newscript.nonamespace"));
    return false;
  } else {
    script.push("// @namespace      " + namespace);
  }

  var descr = document.getElementById("descr").value;
  if ("" != descr) {
    script.push("// @description    " + descr);
  }

  var includes = document.getElementById("includes").value;
  if ("" != includes) {
    includes = includes.match(/.+/g);
    includes = "// @include        " + includes.join("\n// @include        ");
    script.push(includes);
  }

  var excludes = document.getElementById("excludes").value;
  if ("" != excludes) {
    excludes = excludes.match(/.+/g);
    excludes = "// @exclude        " + excludes.join("\n// @exclude        ");
    script.push(excludes);
  }

  script.push("// ==/UserScript==");

  script = script.join("\n");

  return script;
};