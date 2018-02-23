// ==UserScript==
// @name        GM set/get demo
// @description Exercises both GM.getValue() and GM.getValue().  Logs a counter which goes up by one, at each page load.
// @grant       GM.getValue
// @grant       GM.setValue
// ==/UserScript==

async function getSetDemo() {
  console.log('Starting the get/set demo ...');
  let i = await GM.getValue('i', 0);
  console.log(`This time, i was ${i}.`);
  GM.setValue('i', i+1);
}
getSetDemo();
