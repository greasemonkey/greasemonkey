var EXPORTED_SYMBOLS = ['parse'];

Components.utils.import('chrome://greasemonkey-modules/content/extractMeta.js');
Components.utils.import('chrome://greasemonkey-modules/content/script.js');
Components.utils.import('chrome://greasemonkey-modules/content/scriptIcon.js');
Components.utils.import('chrome://greasemonkey-modules/content/scriptRequire.js');
Components.utils.import('chrome://greasemonkey-modules/content/scriptResource.js');
Components.utils.import('chrome://greasemonkey-modules/content/third-party/MatchPattern.js');
Components.utils.import('chrome://greasemonkey-modules/content/util.js');

var gIoService = Components.classes["@mozilla.org/network/io-service;1"]
    .getService(Components.interfaces.nsIIOService);
var gStringBundle = Components
    .classes["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .createBundle("chrome://greasemonkey/locale/greasemonkey.properties");

/** Parse the source of a script; produce Script object. */
function parse(aSource, aUri, aFailWhenMissing, aNoMetaOk) {
  var meta = extractMeta(aSource).match(/.+/g);
  if (aFailWhenMissing && !meta && !aNoMetaOk) return null;

  var script = new Script();

  var scriptName = null;
  if (aUri) script.downloadURL = aUri.spec;
  if (aUri && aUri.spec) {
    scriptName = aUri.spec;
    scriptName = scriptName.substring(0, scriptName.indexOf(".user.js"));
    scriptName = scriptName.substring(scriptName.lastIndexOf("/") + 1);
    script._name = scriptName;
  }
  if (aUri) script._namespace = aUri.host;

  if (!meta && aNoMetaOk) {
    setDefaults(script);
    return script;
  }

  var resourceNames = {};
  for (var i = 0, metaLine = ''; metaLine = meta[i]; i++) {
    try {
      var data = GM_util.parseMetaLine(metaLine.replace(/\s+$/, ''));
    } catch (e) {
      // Ignore invalid/unsupported meta lines.
      continue;
    }

    switch (data.keyword) {
    case 'noframes':
      script._noframes = true;
      break;

    case 'description':
    case 'name':
      var locale = data.locale;

      if (locale) {
        if (!script._locales[locale]) {
          script._locales[locale] = {};
        }
        script._locales[locale][data.keyword] = data.value;
      }
      else {
        if ((data.keyword == 'description')
            && (script['_' + data.keyword] == ''))
            script['_' + data.keyword] = data.value;
        if ((data.keyword == 'name')
            && ((script['_' + data.keyword] == 'user-script')
            || (script['_' + data.keyword] == scriptName)))
            script['_' + data.keyword] = data.value;
      }

      break;

    case 'resource':
      var name = data.value1;
      var url = data.value2;

      if (name in resourceNames) {
        script.parseErrors.push(
            gStringBundle.GetStringFromName('parse.resource-duplicate')
                .replace('%1', name));
        break;
      }
      resourceNames[name] = true;

      try {
        var resUri = GM_util.uriFromUrl(url, aUri);
        var scriptResource = new ScriptResource(script);
        scriptResource._name = name;
        scriptResource._downloadURL = resUri.spec;
        script._resources.push(scriptResource);
        script._rawMeta += data.keyword + '\0'
            + name + '\0'
            + resUri.spec + '\0';
      } catch (e) {
        script.parseErrors.push(
            gStringBundle.GetStringFromName('parse.resource-failed')
                .replace('%1', name).replace('%2', url)
            );
      }

      break;

    case 'namespace':
    case 'version':
      script['_' + data.keyword] = data.value;
      break;
    case 'exclude':
      script._excludes.push(data.value);
      break;
    case 'grant':
      script._grants.push(data.value);
      break;
    case 'include':
      script._includes.push(data.value);
      break;
    case 'run-at':
      script._runAt = data.value;
      break;

    case 'installURL':
      data.keyword = 'downloadURL';
    case 'downloadURL':
    case 'updateURL':
      try {
        var uri = GM_util.uriFromUrl(data.value, aUri);
        script[data.keyword] = uri.spec;
      } catch (e) {
        dump('Failed to parse ' + data.keyword
            + ' "' + data.value + '":\n' + e + '\n');
      }
      break;

    case 'icon':
      try {
        script.icon.setMetaVal(data.value);
        script._rawMeta += data.keyword + '\0' + data.value + '\0';
      } catch (e) {
        script.parseErrors.push(e.message);
      }
      break;

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

    case 'require':
      try {
        var reqUri = GM_util.uriFromUrl(data.value, aUri);
        var scriptRequire = new ScriptRequire(script);
        scriptRequire._downloadURL = reqUri.spec;
        script._requires.push(scriptRequire);
        script._rawMeta += data.keyword + '\0' + data.value + '\0';
      } catch (e) {
        dump('require err:'+e+'\n');
        script.parseErrors.push(
            gStringBundle.GetStringFromName('parse.require-failed')
                .replace('%1', data.value)
            );
      }
      break;
    }
  }

  setDefaults(script);
  return script;
}


function setDefaults(script) {
  if (!script.updateURL && script.downloadURL) {
    script.updateURL = script.downloadURL;
  }
  if ('document-start' != script._runAt && 'document-end' != script._runAt) {
    script._runAt = 'document-end';
  }
  if (script._includes.length == 0 && script._matches.length == 0) {
    script._includes.push('*');
  }
}
