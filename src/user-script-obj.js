/*
The UserScript object represents a user script, and all content and behaviors.

There are several contexts in which we want a similar (but not identical!) set
of data:
- We're in the process of installing a new user script.
- An installed user script needs to run.
- ...
So we ...
*/

// Public API.
var UserScript;

// Private implementation.
(function() {


function randomUuid() {
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
      r = parseInt(r, 16)&0x3|0x8;
      r = r.toString(16);
    }
    return r;
  });

  return uuid;
}


class _UserScript {
  constructor(details, values) {
    // Fixed details parsed from the ==UserScript== section.
    this._details = {
      'description': null,
      'downloadUrl': null,
      'excludes': [],
      'iconUrl': null,
      'includes': [],
      'matches': [],
      'name': 'user-script',
      'namespace': null,
      'noFrames': false,
      'requireUrls': [],
      'resourceUrls': [],
      'runAt': false,
      'version': null,
    }

    // Variable user settings.
    this._enabled = true;
//    this._userExcludes = [];
//    this._userMatches = [];
//    this._userIncludes = [];

    // Stored values.
    this._values = {
      'content': null,  // TODO: Content of raw installed user script.
      'evalContent': null,  // TODO: Calculated final eval string, whole script.
      'uuid': null,
      'requires': null  // TODO: Content of raw installed requires.
    };

    if (details) this._loadInto(details, this._details);
    if (values) this._loadInto(values, this._values);

    if (!this._values.uuid) {
      this._values.uuid = randomUuid();
    }
  }

  _loadInto(src, dest) {
    Object.keys(src).forEach(k => {
      if (!dest.hasOwnProperty(k)) {
        throw new Error('Unsupported property: ' + k);
      }
      dest[k] = src[k];
    });
  }

  get details() {
    return new Object(this._details);
  }
}

UserScript = _UserScript;  // Export.

})();
