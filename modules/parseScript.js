var EXPORTED_SYMBOLS = [
    'extractMeta', 'parse', 'parseMetaById', 'gLineSplitRegexp', 'gMetaLineRegexp'];

Components.utils.import('resource://greasemonkey/script.js');
Components.utils.import('resource://greasemonkey/scriptIcon.js');
Components.utils.import('resource://greasemonkey/scriptRequire.js');
Components.utils.import('resource://greasemonkey/scriptResource.js');
Components.utils.import('resource://greasemonkey/third-party/MatchPattern.js');
Components.utils.import('resource://greasemonkey/util.js');

var gIoService = Components.classes["@mozilla.org/network/io-service;1"]
    .getService(Components.interfaces.nsIIOService);
var gLineSplitRegexp = /.+/g;
var gAllMetaRegexp = new RegExp(
    '^// ==UserScript==([\\s\\S]*?)^// ==/UserScript==', 'm');
var gMetaLineRegexp = new RegExp('// @(\\S+)(?:\\s+(.*))?');
var gStringBundle = Components
    .classes["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .createBundle("chrome://greasemonkey/locale/greasemonkey.properties");

/** Get just the stuff between ==UserScript== lines. */
function extractMeta(aSource) {
  var meta = aSource.match(gAllMetaRegexp);
  if (meta) return meta[1].replace(/^\s+/, '');
  return '';
}

/** Gets meta value by meta id from source of a script. **/
function parseMetaById(aSource, aId) {
  var metaLines = extractMeta(aSource).match(gLineSplitRegexp);
  for (var j = 0, metaLine = null; metaLine = metaLines[j]; j++) {
    metaLine = metaLine.replace(/\s+$/, '');
    var match = metaLine.match(gMetaLineRegexp);
    if (!match) continue;
    if (aId == match[1] && match[2]) {
      return match[2];
    }
  }
  return null;
}

/** Parse the source of a script; produce Script object. */
function parse(aSource, aUri, aFailWhenMissing, aNoMetaOk) {
  var meta = extractMeta(aSource).match(gLineSplitRegexp);
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
  if (meta) for (var i = 0, metaLine = ''; metaLine = meta[i]; i++) {
    metaLine = metaLine.replace(/\s+$/, '');

    var match = metaLine.match(gMetaLineRegexp);
    if (!match) continue;

    var header = match[1];
    var value = match[2] || null;

    switch (header) {
    case 'description':
    case 'name':
    case 'namespace':
    case 'version':
    case 'updateMetaStatus':
      script['_' + header] = value;
      break;

    case 'installURL':
      header = 'downloadURL';
    case 'downloadURL':
    case 'updateURL':
      try {
        var uri = GM_util.uriFromUrl(value, aUri);
        script[header] = uri.spec;
      } catch (e) {
        dump('Failed to parse ' + header + ' "' + value + '":\n' + e + '\n');
      }
      break;

    case 'exclude':
      script._excludes.push(value);
      break;
    case 'grant':
      script._grants.push(value);
      break;
    case 'icon':
      try {
        script.icon.setMetaVal(value);
        script._rawMeta += header + '\0' + value + '\0';
      } catch (e) {
        script.parseErrors.push(e.message);
      }
      break;
    case 'include':
      script._includes.push(value);
      break;
    case 'match':
      try {
        var match = new MatchPattern(value);
        script._matches.push(match);
      } catch (e) {
        script.parseErrors.push(
            gStringBundle.GetStringFromName('parse.ignoring-match')
                .replace('%1', value).replace('%2', e)
            );
      }
      break;
    case 'require':
      try {
        var reqUri = GM_util.uriFromUrl(value, aUri);
        var scriptRequire = new ScriptRequire(script);
        scriptRequire._downloadURL = reqUri.spec;
        script._requires.push(scriptRequire);
        script._rawMeta += header + '\0' + value + '\0';
      } catch (e) {
        script.parseErrors.push(
            gStringBundle.GetStringFromName('parse.require-failed')
                .replace('%1', value)
            );
      }
      break;
    case 'resource':
      var res = value.match(/(\S+)\s+(.*)/);
      if (res === null) {
        script.parseErrors.push(
            gStringBundle.GetStringFromName('parse.resource-syntax')
                .replace('%1', value)
            );
        break;
      }

      var resName = res[1];
      if (resourceNames[resName]) {
        script.parseErrors.push(
            gStringBundle.GetStringFromName('parse.resource-duplicate')
                .replace('%1', resName)
            );
        break;
      }
      resourceNames[resName] = true;

      try {
        var resUri = GM_util.uriFromUrl(res[2], aUri);
        var scriptResource = new ScriptResource(script);
        scriptResource._name = resName;
        scriptResource._downloadURL = resUri.spec;
        script._resources.push(scriptResource);
        script._rawMeta += header + '\0' + resName + '\0' + resUri.spec + '\0';
      } catch (e) {
        script.parseErrors.push(
            gStringBundle.GetStringFromName('parse.resource-failed')
                .replace('%1', resName).replace('%2', res[2])
            );
      }
      break;
    case 'run-at':
      script._runAt = value;
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
