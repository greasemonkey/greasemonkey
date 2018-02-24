// ==UserScript==
// @name        @match test
// @description This user script relies upon the `@match` directive to run.
// @grant       none
// @match       *://localhost/*
// @match       http://localhost/*
// @match       https://*/*
// @match       *://*/*
// @match       <all_urls>
// ==/UserScript==

console.log('@match script ran!');
