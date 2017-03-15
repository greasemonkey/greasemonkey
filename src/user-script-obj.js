/*
The UserScript object represents a user script, and all content and behaviors.

There are several contexts in which we want a similar (but not identical!) set
of data:
- We're in the process of installing a new user script.
- An installed user script needs to run.
- ...
So we ...

This file uses `storage.local` with the prefix "user-script-".  The
`UserScriptRegistry` can enumerate installed scripts (by UUID), and each
installed scripts has ... [TODO several keys starting user-script-UUID-].
*/

// Private implementation.
(function() {

/// Safely copies selected input values to another object.
function _loadValuesInto(dest, vals, keys) {
  Object.keys(vals).forEach(k => {
    if (!keys.includes(k)) {
      throw new Error(
          'Unsupported property for ' + dest.constructor.name + ': ' + k);
    }
    dest[k] = _safeCopy(vals[k]);
  });
}


function _randomUuid() {
  var randomInts = new Uint8Array(16);
  window.crypto.getRandomValues(randomInts);
  var randomChars = [];
  for (let i = 0; i<16; i++) {
    let s = randomInts[i].toString(16);
    randomChars.push(s.substr(0, 1));
    randomChars.push(s.substr(1, 1));
  }

  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
  uuid = uuid.replace(/[xy]/g, function(c) {
    let r = randomChars.shift();
    if (c == 'y') {
      r = (parseInt(r, 16)&0x3|0x8).toString(16);
    }
    return r;
  });

  return uuid;
}


/// Returns v unless v is an array, then a (shallow) copy of v.
function _safeCopy(v) {
  return (v && v.constructor == Array) ? v.slice() : v;
}


const userScriptKeys = [
    'description', 'downloadUrl', 'excludes', 'iconUrl', 'includes', 'matches',
    'name', 'namespace', 'noFrames', 'requireUrls', 'resourceUrls', 'runAt',
    'version'];
/// Base class, fields and methods common to all kinds of UserScript objects.
window.RemoteUserScript = class {
  constructor(vals) {
    // Fixed details parsed from the ==UserScript== section.
    this._description = null;
    this._downloadUrl = null;
    this._excludes = [];
    this._iconUrl = null;
    this._includes = [];
    this._matches = [];
    this._name = 'user-script';
    this._namespace = null;
    this._noFrames = false;
    this._requireUrls = [];
    this._resourceUrls = [];
    this._runAt = false;
    this._version = null;

    _loadValuesInto(this, vals, userScriptKeys);
  }

  get details() {
    var d = {};
    userScriptKeys.forEach(k => {
      d[k] = _safeCopy(this['_' + k]);
    });
    return d;
  }

  get description() { return this._description; }
  get downloadUrl() { return this._downloadUrl; }
  get excludes() { return _safeCopy(this._excludes); }
  get iconUrl() { return this._iconUrl; }
  get includes() { return _safeCopy(this._includes); }
  get matches() { return _safeCopy(this._matches); }
  get name() { return this._name; }
  get namespace() { return this._namespace; }
  get noFrames() { return this._noFrames; }
  get requireUrls() { return _safeCopy(this._requireUrls); }
  get resourceUrls() { return _safeCopy(this._resourceUrls); }
  get runAt() { return this._runAt; }
  get version() { return this._version; }
}


const runnableUserScriptKeys = [
    'enabled', 'evalContent', 'userExcludes', 'userMatches', 'userIncludes',
    'uuid'];
/// A _UserScript, plus user settings, plus (eval'able) contents.  Should
/// never be called except by `UserScriptRegistry.`
window.RunnableUserScript = class extends window.RemoteUserScript {
  constructor(details) {
    super(details);

    this._enabled = true;
    this._evalContent = null;  // TODO: Calculated final eval string.
    this._userExcludes = [];  // TODO: Not implemented.
    this._userIncludes = [];  // TODO: Not implemented.
    this._userMatches = [];  // TODO: Not implemented.
    this._uuid = null;

    _loadValuesInto(this, details, runnableUserScriptKeys);

    if (!this._uuid) {
      this._uuid = _randomUuid();
      console.info(
          'For new RunnableUserScript ' + this._name
          + ', created UUID: ' + this._uuid);
    }
  }

  get details() {
    var d = super.details();
    runnableUserScriptKeys.forEach(k => {
      d[k] = _safeCopy(this['_' + k]);
    });
    return d;
  }

  get enabled() { return this._enabled; }
  get evalContent() { return this._evalContent; }
  get userExcludes() { return _safeCopy(this._userExcludes); }
  get userIncludes() { return _safeCopy(this._userIncludes); }
  get userMatches() { return _safeCopy(this._userMatches); }
  get uuid() { return this._uuid; }
}


const editableUserScriptKeys = ['content', 'requiresContent'];
/// A _UserScript, plus user settings, plus (eval'able) contents.  Should
/// never be called except by `UserScriptRegistry.`
window.EditableUserScript = class extends window.RunnableUserScript {
  constructor(details) {
    super(details);

    this._content = null;  // TODO: Content of raw installed user script.
    this._requiresContent = [];  // TODO: Content of raw installed requires.

    _loadValuesInto(this, details, editableUserScriptKeys);
  }

  get details() {
    var d = super.details();
    editableUserScriptKeys.forEach(k => {
      d[k] = _safeCopy(this['_' + k]);
    });
    return d;
  }

  get content() { return this._content; }
  get requiresContent() { return _safeCopy(this._requiresContent); }
}

})();
