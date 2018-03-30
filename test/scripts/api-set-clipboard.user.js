'use strict';
// ==UserScript==
// @name        GM.setClipboard() Test
// @description Exercise the `GM.setClipboard()` API method.  After every page load, the clipboard should contain "Clip from GM!".
// @grant       GM.setClipboard
// ==/UserScript==

GM.setClipboard('Clip from GM!');
