// ==UserScript==
// @name          Irrelevant
// @namespace     http://youngpup.net/userscripts
// @description	  Removes the advertisement from the left side of relevantmagazine.com.
// @include       http://*relevantmagazine.com*
// ==/UserScript==

(function() {
    var advert = document.getElementsByTagName("IFRAME")[0];
    advert.parentNode.removeChild(advert);
})();