// Public API.
var parseUserScript = null;

// Private implementation.
(function() {

var gAllMetaRegexp = new RegExp(
    '^(\u00EF\u00BB\u00BF)?// ==UserScript==([\\s\\S]*?)^// ==/UserScript==',
    'm');


/** Get just the stuff between ==UserScript== lines. */
function extractMeta(content) {
  var meta = content.match(gAllMetaRegexp);
  if (meta) return meta[2].replace(/^\s+/, '');
  return '';
}


/** Pull the filename part from the URL, without `.user.js`. */
function nameFromUrl(url) {
  var name = url.substring(0, url.indexOf(".user.js"));
  name = name.substring(name.lastIndexOf("/") + 1);
  return name;
}


/** Parse the source of a script; produce UserScript object. */
parseUserScript = function parseUserScriptImpl(content, url, failIfMissing) {
  if (!content) {
    throw new Error('parseUserScript() got no content!');
  }
  if (!url) {
    throw new Error('parseUserScript() got no url!');
  }

  var meta = extractMeta(content).match(/.+/g);
  if (failIfMissing && !meta) return null;

  // Populate with defaults in case the script specifies no value.
  var details = {
    'downloadUrl': url,
    'excludes': [],
    'includes': [],
    'matches': [],
    'name': nameFromUrl(url),
    'namespace': new URL(url).host,
    'requireUrls': [],
    'resourceUrls': [],
    'runAt': 'document-end'
  };

  if (!meta) {
    return new UserScript(details);
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
      details.runAt = data.value;
      break;
    /*
    case 'grant':
      details.grants.push(data.value);
      break;
    */

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
    /*
    case 'match':
      try {
        var match = new MatchPattern(data.value);
        script._matches.push(match);
      } catch (e) {
        script.parseErrors.push(
            gStringBundle.GetStringFromName('parse.ignoring-match')
                .replace('%1', data.value).replace('%2', e)
            );
      }
      break;
    */

    case 'icon':
      details.iconUrl = new URL(data.value, url).toString();
      break;
    case 'require':
      details.requireUrls.push( new URL(data.value, url).toString() );
      break;
    case 'resource':
      details.resourceUrls.push( new URL(data.value, url).toString() );
      break;
    }
  }

  // We couldn't set this default above in case of real data, so if there's
  // still no includes, set the default of include everything.
  if (details.includes.length == 0) {
    details.includes.push('*');
  }

  return new UserScript(details);
}

})();
