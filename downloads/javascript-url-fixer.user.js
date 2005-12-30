// ==UserScript==
// @name            Popup Window Fixer
// @namespace       http://youngpup.net/userscripts
// @description     Fixes poorly written javascript popup windows in the manner specified by http://youngpup.net/2003/popups.
// @include         *
// ==/UserScript==

(function () {

    const urlRegex = /\b(https?:\/\/[^\s+\"\<\>\'\(\)]+)/ig;
    var candidates = document.getElementsByTagName("a");

    for (var cand = null, i = 0; (cand = candidates[i]); i++) {
        if (cand.getAttribute("onclick") == null && cand.href.toLowerCase().indexOf("javascript:") == 0) {
            var match = cand.href.match(urlRegex);

            if (match != null) {
                cand.setAttribute("onclick", cand.href + "\nreturn false;");
                cand.setAttribute("href", match[0]);
            }
        }
    }

})();