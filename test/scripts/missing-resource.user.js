'use strict';
// ==UserScript==
// @name        Missing resource test.
// @description Exercises the `@resource` directive, pointing at an invalid (will 404) URL.  Should show an error in the install dialog, and not offer the install action.
// @grant       none
// @resource    txt 404.txt
// ==/UserScript==

