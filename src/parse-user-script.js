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
// if a URL constructor recieved an absolute URL as the path then the base
// is ignored. Unfortunately that doesn't seem to be the case. And if the
// base is invalid (null / empty string) then an exception is thrown.
function safeURL(path, base) {
  if (base) {
    return new URL(path, base);
  } else {
    return new URL(path);
  }
}


function parseRemoteResources(details) {
  let currentUrl;
  let remoteType;
  let downloadUrl = details.downloadUrl;

  try {
    if (details.iconUrl) {
      remoteType = 'icon'
      currentUrl = details.iconUrl;
      details.iconUrl = safeURL(currentUrl, downloadUrl).toString();
    }

    let requireUrls = details.requireUrls;
    if (requireUrls.length) {
      remoteType = 'require';
      for (let idx = requireUrls.length; idx--;) {
        currentUrl = requireUrls[idx];
        requireUrls[idx] = safeURL(currentUrl, downloadUrl).toString();
      }
    }

    let resourceKeys = Object.keys(details.resourceUrls);
    if (resourceKeys.length) {
      let resourceUrls = details.resourceUrls;
      remoteType = 'resource';
      for (key of resourceKeys) {
        currentUrl = resourceUrls[key];
        resourceUrls[key] = safeURL(currentUrl, downloadUrl).toString();
      }
    }
  } catch (e) {
    if (e instanceof TypeError) {
      // Could not create URL object. Likely due to missing downloadUrl
      throw new InvalidRemoteUrl(remoteType, currentUrl);
    } else {
      throw e;
    }
  }
}


/** Parse the source of a script; produce object of data. */
window.parseUserScript = function(content, url, failIfMissing) {
  if (!content) {
    throw new Error('parseUserScript() got no content!');
  }

  var meta = extractMeta(content).match(/.+/g);
  if (failIfMissing && !meta) return null;

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

  if (!meta) {
    return details;
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
    case 'downloadURL':
      details.downloadUrl = data.value;
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
            _('Ignoring @match pattern $1 because:\n$2', data.value, e));
      }
      break;

    // The following need to be done last in order to account for explicit
    // @downloadURL. Save the provided values for further processing.
    case 'icon':
      details.iconUrl = data.value;
      break;
    case 'require':
      details.requireUrls.push(data.value);
      break;
    case 'resource':
      let resourceName = data.value1;
      let resourceUrl = data.value2;
      if (resourceName in details.resourceUrls) {
        throw new DuplicateResourceError(
            _('Duplicate resource name: $1', resourceName));
      }
      details.resourceUrls[resourceName] = resourceUrl;
      break;
    }
  }

  // Process remote resources
  parseRemoteResources(details);

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
