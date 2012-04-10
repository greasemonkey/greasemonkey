var EXPORTED_SYMBOLS = ['extractMeta', 'parse'];

Components.utils.import('resource://greasemonkey/script.js');
Components.utils.import('resource://greasemonkey/scriptIcon.js');
Components.utils.import('resource://greasemonkey/scriptRequire.js');
Components.utils.import('resource://greasemonkey/scriptResource.js');
Components.utils.import('resource://greasemonkey/third-party/MatchPattern.js');
Components.utils.import('resource://greasemonkey/util.js');

var gLineSplitRegexp = /.+/g;
var gAllMetaRegexp = new RegExp(
    '^// ==UserScript==([\\s\\S]*?)^// ==/UserScript==', 'm');
var gMetaLineRegexp = new RegExp('// @(\\S+)(?:\\s+(.*))?');

/** Get just the stuff between ==UserScript== lines. */
function extractMeta(aSource) {
  var meta = aSource.match(gAllMetaRegexp);
  if (meta) return meta[1].replace(/^\s+/, '');
  return '';
}

/** Parse the source of a script; produce Script object. */
function parse(aSource, aUri, aFailWhenMissing) {
  var meta = extractMeta(aSource).match(gLineSplitRegexp);
  if (aFailWhenMissing && !meta) return null;

  var script = new Script();

  if (aUri) script._downloadURL = aUri.spec;
  if (aUri && aUri.spec) {
    var name = aUri.spec;
    name = name.substring(0, name.indexOf(".user.js"));
    name = name.substring(name.lastIndexOf("/") + 1);
    script._name = name;
  }
  if (aUri) script._namespace = aUri.host;

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
    case 'updateURL':
    case 'version':
      script['_' + header] = value;
      break;

    case 'downloadURL':
    case 'installURL':
      script._downloadURL = value;
      break;
    case 'exclude':
      script._excludes.push(value);
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
        // TODO: Localize.
        script.parseErrors.push(
            'Ignoring @match pattern ' + value + ' because:\n' + e);
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
        // TODO: Localize.
        script.parseErrors.push('Failed to @require URL: '+ value);
      }
      break;
    case 'resource':
      var res = value.match(/(\S+)\s+(.*)/);
      if (res === null) {
        // TODO: Localize.
        script.parseErrors.push(
            'Invalid syntax for @resource declaration "' + value
            + '". Resources are declared like "@resource <name> <url>".');
        break;
      }

      var resName = res[1];
      if (resourceNames[resName]) {
        script.parseErrors.push(
            'Duplicate resource name "' + resName + '" detected. '
            + 'Each resource must have a unique name.');
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
            'Failed to get @resource '+ resName +' from ' + res[2]);
      }
      break;
    case 'run-at':
      script._runAt = value;
      break;
    case 'unwrap':
      script._unwrap = true;
      break;
    }
  }

  if (!script.updateURL && script._downloadURL) {
    script.updateURL = script._downloadURL;
  }
  if ('document-start' != script._runAt && 'document-end' != script._runAt) {
    script._runAt = 'document-end';
  }
  if (script._includes.length == 0 && script._matches.length == 0) {
    script._includes.push('*');
  }

  return script;
}
