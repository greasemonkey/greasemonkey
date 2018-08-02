'use strict';
// ==UserScript==
// @name        Image resource example
// @description Exercise the `GM.getResourceUrl()` API method and handling of binary `@resource` entries.  Should append a Greasemonkey icon image to all pages.
// @resource    logo https://wiki.greasespot.net/favicon.ico
// @grant       GM.getResourceUrl
// ==/UserScript==

(async function() {
let img = document.createElement("img");
img.src = await GM.getResourceUrl("logo");
document.body.appendChild(img);
})();

