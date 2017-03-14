/*
The registry of installed user scripts.

The `UserScriptRegistry` object owns a set of UserScript objects, and exports
methods for discovering them.

This file uses `storage.local` with the prefix "registry-".  There is a key
"registry-root" which stores (JSON serialized) the set of installed scripts
and the generated (random) ID of each.  The ID is used to form further keys
to fetch the sources and resources of each script.
*/

// Public API.
const UserScriptRegistry = {};


// Private implementation.
(function() {

})();
