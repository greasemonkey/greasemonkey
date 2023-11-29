// ==UserScript==
// @name        GM.rmc many command test
// @description Register so many menu commands that the monkey menu will need to scroll.
// @version     1
// @grant       GM.registerMenuCommand
// ==/UserScript==

for (let i = 1; i <= 100; i++) {
  GM.registerMenuCommand(
      'GM.rmc example ' + i, () => console.log ('GM.rmc example ' + i));
}
