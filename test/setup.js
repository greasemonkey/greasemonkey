'use strict';
// user-script-obj.js looks up the extension version from the manifest
chrome.runtime.getManifest.returns({'version': 1});

// Reference the served e.g. icon URL correctly.
chrome.extension.getURL.callsFake(suffix => '/base/' + suffix);

// See comment for details
// https://github.com/greasemonkey/greasemonkey/pull/2812#issuecomment-358776737
navigator.storage.persist = () => Promise.resolve(true);

// In tests, never complain about missing translations.
function _(str, ...args) {
  return [str, args].flat().join(' ');
}

// Given array of meta lines, create a parsable meta block.
function metaBlockFromLines(...metaLines) {
  return '// ==UserScript==\n' + metaLines.join('\n') + '\n// ==/UserScript==\n';
}
