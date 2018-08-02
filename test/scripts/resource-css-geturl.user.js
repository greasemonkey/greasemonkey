'use strict';
// ==UserScript==
// @name        GM.getResourceUrl() test
// @description Exercise the `GM.getResourceUrl()` APi method.  Should cause all pages to have a dashed red border.
// @resource    CSS resource.css
// @grant       GM.getResourceUrl
// ==/UserScript==

(async () => {
  let cssUrl = await GM.getResourceUrl('CSS');
  let style = document.createElement('link');
  style.setAttribute('href', cssUrl);
  style.setAttribute('rel', 'stylesheet');
  document.body.appendChild(style);
})();
