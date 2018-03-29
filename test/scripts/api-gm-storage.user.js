'use strict';
// ==UserScript==
// @name        GM set/get/list/delete
// @description Exercises all GM storage methods, with bare `Promise`s (no async/await).  Should log "got value =" with an increasing (on each page load) counter, then `["temp", "val"]`, then then `["val"]`.
// @grant       GM.deleteValue
// @grant       GM.getValue
// @grant       GM.listValues
// @grant       GM.setValue
// ==/UserScript==


try {
  GM.getValue('val', 0).then(val => {
    try {
      console.log('got value =', val);
      GM.setValue('val', val + 1);
    } catch (e) { console.error(e); }
  });
} catch (e) { console.error(e); }


try {
  GM.setValue('temp', 'temp').then(
    () => GM.listValues().then(values => {
      console.log('1 I see:', values);
      GM.deleteValue('temp').then(() => {
        GM.listValues().then(values => {
          console.log('2 I see:', values);
        });
      });
    })
  );
} catch (e) { console.error(e); }
