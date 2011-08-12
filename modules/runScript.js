function GM_runScript(code, sandbox, maxJSVersion) { Components.utils.evalInSandbox(code, sandbox, maxJSVersion); }
// NOTE:
// This function is intentionally contained completely within line one.
// This is used to grant the a predictable file/line numbers to exceptions
// raised inside the eval.
//
// This is a workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=307984
//
// Users: If you see an error coming from this file, that's because we haven't
// yet found a way to work around the bug completely.  If you have asynchronous
// code (setTimeout, any kind of event listener or GM_xmlhttpRequest callback),
// any errors within it will be reported as coming from this file, as their
// eval source (line 1) + the line within your script (and any prepended
// @required scripts).
//
// The rest of the module follows.
//

var EXPORTED_SYMBOLS = ["GM_runScript", "GM_runScript_filename"];

GM_runScript_filename = Components.stack.filename;
