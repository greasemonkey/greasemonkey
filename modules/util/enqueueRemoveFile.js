Components.utils.import('resource://greasemonkey/prefmanager.js');

const EXPORTED_SYMBOLS = ['enqueueRemoveFile'];


function addEnqueuedPath(aPath) {
  var paths = getEnqueuedPaths();
  paths.push(aPath);
  GM_prefRoot.setValue('enqueuedRemovals', JSON.stringify(paths));
}

function getEnqueuedPaths() {
  return JSON.parse(GM_prefRoot.getValue('enqueuedRemovals', '[]'));
}

function removeEnqueuedPath(aPath) {
  var paths = getEnqueuedPaths();
  do {
    var i = paths.indexOf(aPath);
    if (i != -1) paths.splice(i, 1);
  } while (i != -1);
  GM_prefRoot.setValue('enqueuedRemovals', JSON.stringify(paths));
}

/** Try to remove a file identified by path; return true for success. */
function removePath(aPath, aDoEnqueueFailure) {
  var file = Components.classes["@mozilla.org/file/local;1"]
      .createInstance(Components.interfaces.nsILocalFile);
  try {
    file.initWithPath(aPath);
  } catch (e) {
    // Invalid path; just act like it was removed.
    return true;
  }

  if (file.exists()) {
    try {
      file.remove(false);
    } catch (e) {
      if (aDoEnqueueFailure) addEnqueuedPath(aPath);
      return false;
    }
  }

  return true;
}

function enqueueRemoveFile(aFile) {
  removePath(aFile.path, true);
}

// Once at start up, try to remove all enqueued paths.
(function() {
  var paths = getEnqueuedPaths();
  for (var i = 0, path = null; path = paths[i]; i++) {
    if (removePath(path, false)) {
      removeEnqueuedPath(path);
    }
  }
})();
