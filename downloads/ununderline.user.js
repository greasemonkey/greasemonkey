// ==UserScript==
// @description		Converts underlined text to italics, making it more distinguishable from a hyperlink.
// ==/UserScript==

(function () {
	var ss = document.createElement("style");
	var t = document.createTextNode("u { text-decoration:none!important; font-style:italic!important; }");
    var root = (document.getElementsByTagName("head")[0] || document.getElementsByTagName("body")[0]);
	ss.appendChild(t);
	root.appendChild(ss);
})();