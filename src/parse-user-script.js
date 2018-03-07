const gAllMetaRegexp = new RegExp(
    '^(\u00EF\u00BB\u00BF)?// ==UserScript==([\\s\\S]*?)^// ==/UserScript==',
    'm');


/** Get just the stuff between ==UserScript== lines. */
function extractMeta(content) {
  var meta = content && content.match(gAllMetaRegexp);
  if (meta) return meta[2].replace(/^\s+/, '');
  return '';
}


// Private implementation.
(function() {

/** Pull the filename part from the URL, without `.user.js`. */
function nameFromUrl(url) {
  var name = url.substring(0, url.indexOf(".user.js"));
  name = name.substring(name.lastIndexOf("/") + 1);
  return name;
}


// Safely construct a new URL object from a path and base. According to MDN,
// if a URL constructor received an absolute URL as the path then the base
// is ignored. Unfortunately that doesn't seem to be the case. And if the
// base is invalid (null / empty string) then an exception is thrown.
function safeUrl(path, base) {
  if (base) {
    return new URL(path, base);
  } else {
    return new URL(path);
  }
}


/** Parse the source of a script; produce object of data. */
window.parseUserScript = function(content, url, failWhenMissing=false) {
  if (!content) {
    throw new Error('parseUserScript() got no content!');
  }

  // Populate with defaults in case the script specifies no value.
  var details = {
    'downloadUrl': url,
    'excludes': [],
    'grants': [],
    'includes': [],
    'matches': [],
    'name': url && nameFromUrl(url) || 'Unnamed Script',
    'namespace': url && new URL(url).host || null,
    'noFrames': false,
    'requireUrls': [],
    'resourceUrls': {},
    'runAt': 'end'
  };

  var meta = extractMeta(content).match(/.+/g);
  if (!meta) {
    if (failWhenMissing) {
      throw new Error('Could not parse, no meta.');
    } else {
      return details;
    }
  }

  let locales = {};

  for (let i = 0, metaLine = ''; metaLine = meta[i]; i++) {
    try {
      var data = parseMetaLine(metaLine.replace(/\s+$/, ''));
    } catch (e) {
      // Ignore invalid/unsupported meta lines.
      continue;
    }

    switch (data.keyword) {
    case 'noframes':
      details.noFrames = true;
      break;
    case 'namespace':
    case 'version':
      details[data.keyword] = data.value;
      break;
    case 'run-at':
      details.runAt = data.value.replace('document-', '');
      // TODO: Assert/normalize to supported value.
      break;
    case 'grant':
      if (data.value == 'none' || SUPPORTED_APIS.has(data.value)) {
        details.grants.push(data.value);
      }
      break;

    case 'description':
    case 'name':
      let locale = data.locale;
      if (locale) {
        if (!locales[locale]) locales[locale] = {};
        locales[locale][data.keyword] = data.value;
      } else {
        details[data.keyword] = data.value;
      }
      break;

    case 'exclude':
      details.excludes.push(data.value);
      break;
    case 'include':
      details.includes.push(data.value);
      break;
    case 'match':
      try {
        new MatchPattern(data.value);
        details.matches.push(data.value);
      } catch (e) {
        throw new Error(
            _('ignoring_MATCH_because_REASON', data.value, e));
      }
      break;

    case 'icon':
      details.iconUrl = safeUrl(data.value, url).toString();
      break;
    case 'require':
      details.requireUrls.push( safeUrl(data.value, url).toString() );
      break;
    case 'resource':
      let resourceName = data.value1;
      let resourceUrl = data.value2;
      if (resourceName in details.resourceUrls) {
        throw new Error(_('duplicate_resource_NAME', resourceName));
      }
      details.resourceUrls[resourceName] = safeUrl(resourceUrl, url).toString();
      break;
    }
  }

  // We couldn't set this default above in case of real data, so if there's
  // still no includes, set the default of include everything.
  if (details.includes.length == 0 && details.matches.length == 0) {
    details.includes.push('*');
  }

  if (details.grants.includes('none') && details.grants.length > 1) {
    details.grants = ['none'];
  }

  return details;
}

})();
