'use strict';
// ==UserScript==
// @name        GM.notification() Test
// @description Exercises the `GM.notification()` API method.
// @grant       GM.notification
// ==/UserScript==

GM.notification({
  'text': "This is the notification's `text` value.", 
  'title': "The Notification's Title",
  'onclick': () => console.log('The test notification was clicked.'),
});
