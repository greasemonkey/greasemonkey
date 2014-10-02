var EXPORTED_SYMBOLS = ['extractMeta', 'parse'];

Components.utils.import('resource://greasemonkey/script.js');
Components.utils.import('resource://greasemonkey/scriptIcon.js');
Components.utils.import('resource://greasemonkey/scriptRequire.js');
Components.utils.import('resource://greasemonkey/scriptResource.js');
Components.utils.import('resource://greasemonkey/third-party/MatchPattern.js');
Components.utils.import('resource://greasemonkey/util.js');

var gIoService = Components.classes["@mozilla.org/network/io-service;1"]
    .getService(Components.interfaces.nsIIOService);
var gAllMetaRegexp = new RegExp(
    '^(\u00EF\u00BB\u00BF)?// ==UserScript==([\\s\\S]*?)^// ==/UserScript==',
    'm');
var gStringBundle = Components
    .classes["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .createBundle("chrome://greasemonkey/locale/greasemonkey.properties");


/** Get just the stuff between ==UserScript== lines. */
function extractMeta(aSource) {
  var meta = aSource.match(gAllMetaRegexp);
  if (meta) return meta[2].replace(/^\s+/, '');
  return '';
}


/** Parse the source of a script; produce Script object. */
function parse(aSource, aUri, aFailWhenMissing, aNoMetaOk) {
  var meta = extractMeta(aSource).match(/.+/g);
  if (aFailWhenMissing && !meta && !aNoMetaOk) return null;

  var script = new Script();

  if (aUri) script.downloadURL = aUri.spec;
  if (aUri && aUri.spec) {
    var name = aUri.spec;
    name = name.substring(0, name.indexOf(".user.js"));
    name = name.substring(name.lastIndexOf("/") + 1);
    script._name = name;
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
      dump('parser set no frames\n');
      script._noframes = true;
      break;

    case 'description':
    case 'name':
      var locale = data.locale.replace(/^:/, '');

      if (locale) {
        if (!script._locales[locale]) {
          script._locales[locale] = {};
        }
        script._locales[locale][keyword] = data.value;
      }

      script['_' + data.keyword] = data.value;

      break;

    case 'resource':
      var name = data.value1;
      var url = data.value2;

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
