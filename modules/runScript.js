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
// any errors within it will be reported as coming from this file at one line
// number higher than the real the line within your script (and any prepended
// @require files).
//
// For example, this script:
//   https://gist.github.com/1154205
// Generated an line in the error console like:
//   Error: undefined is not a function
//   Source File: resource://greasemonkey/runScript.js
//   Line: 27
// This error is actually from line 26 of the script which indeed is
// "undefined();" and guaranteed to cause an error.  Because it was called
// inside a setTimeout(), we were unable to catch and fix the error.
//

var EXPORTED_SYMBOLS = ["GM_runScript", "GM_runScript_filename"];

GM_runScript_filename = Components.stack.filename;
