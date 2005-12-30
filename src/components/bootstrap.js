// Greasemonkey bootstrapper. All the files required by Greasemonkey are loaded 
// into this service's JS context and run here. This gives us a nice, stable, 
// and clean area to play in which cannot be polluted by other extensions and 
// which lasts the entire lifetime of Firefox.


// Assumed to exist throughout Greasemonkey
const Cc = Components.classes;
const Ci = Components.interfaces;


// Load all the Greasemonkey javascript files. Order is important.
const GM_LIBS = [
  "MochiKit/Base.js",
  "MochiKit/Async.js",
  "MochiKit/Iter.js",
  "prefmanager.js",
  "utils.js",
  "accelimation.js",
  "browser.js",
  "config.js",
  "convert2RegExp.js",
  "lang.js",
  "manage.js",
  "module.js",
  "menucommander.js",
  "miscapis.js",
  "pagescontrol.js",
  "scriptdownloader.js",
  "xmlhttprequester.js"
  ];


// Now, load all the scripts into this context
GM_dump("initializing...");
for (var i = 0, libPath; libPath = GM_LIBS[i]; i++) {
  GM_dump("Loading library {%s}", libPath);
  Cc["@mozilla.org/moz/jssubscript-loader;1"]
    .getService(Ci.mozIJSSubScriptLoader)
    .loadSubScript("chrome://greasemonkey/content/" + libPath);
}


// Register XPCOM components
var GM_module = new GM_Module();

// Allows our xul code to use the javascript loaded into this service
GM_module.registerObject("{3bb339f9-131b-465b-b52c-97ee10e61a05}",
                         "@greasemonkey.mozdev.org/app-context;1", 
                         "GM_AppContext",
                         {wrappedJSObject:this});

function NSGetModule() {
  return GM_module;
}


/**
 * A utility to output to the console, even before G_Debug is loaded.
 */
function GM_dump(msg) {
  for (var i = 1; i < arguments.length; i++) {
    msg = msg.replace(/\%s/, arguments[i]);
  }

  dump("*** GM *** " + msg + "\n");
}
