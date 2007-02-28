/////////////////////////////// global variables ///////////////////////////////

var config = new Config();
config.load();

var bundle = null;
window.addEventListener("load", function() {
  // init the global string bundle
  bundle = document.getElementById("gm-browser-bundle");

  // load default namespace from pref
  document.getElementById("namespace").value = GM_prefRoot.getValue(
  	"newscript_namespace"
  );
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

  // create a script object with parsed metadata,
  // via the script downloader object
  var sd = new ScriptDownloader(null, tempFile, null);
  sd.parseScript(script, tempFile);
  script = sd.script;

  // make sure entered details will not ruin an existing file
  var existingIndex = config.find(script.namespace, script.name);
  if (existingIndex > -1) {
    var overwrite = confirm(bundle.getString("error.exists"));
    if (!overwrite) return false;
  }

  // finish making the script object ready to install
  script.file = tempFile;
  config.initFilename(script);

  // install this script
  config.install(script);

  // and fire up the editor!
  openInEditor(
    getScriptFile(script.filename),
    document.getElementById("gm-browser-bundle").getString("editor.prompt")
  );

  // persist namespace value
  GM_prefRoot.setValue("newscript_namespace", script.namespace);

  return true;
}

// assemble the XUL fields into a script template
function createScriptSource() {
  var script = ["// ==UserScript=="];

  var name = document.getElementById("name").value;
  if ("" == name) {
    alert(bundle.getString("error.noname"));
    return false;
  } else {
    script.push("// @name           " + name);
  }

  var namespace = document.getElementById("namespace").value;
  if ("" == namespace) {
    alert(bundle.getString("error.nonamespace"));
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
    excludes = "// @exclude        " + excludes.join("// @exclude        ");
    script.push(excludes);
  }

  script.push("// ==/UserScript==");

  script = script.join("\n");

  return script;
}
