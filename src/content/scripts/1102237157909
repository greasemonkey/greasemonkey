// ==UserScript==
// @name			Linkify
// @namespace		http://youngpup.net/userscripts
// @description		Looks for things in the page that look like URLs but aren't hyperlinked, and converts them to clickable links.
// @include			*
// ==/UserScript==

(function () {
	const urlRegex = /\b(https?:\/\/[^\s+\"\<\>]+)/ig;

    // tags which it would not make sense to have anchors inside of.
    var disallowedParents = ["a", "style", "applet", "area", "base", "basefont", "br", "col", "colgroup", "hr", "img", "input", "link", "map", "object", "param", "select", "script"];

    var filters = ["contains(translate(., 'HTTP', 'http'), 'http')"];

    for (var i = 0, tag = null; (tag = disallowedParents[i]); i++) {
        filters.push("not(ancestor::" + tag + ")");
        filters.push("not (ancestor::" + tag.toUpperCase() + ")");
    }

    var xpath = "//text()[" + filters.join(" and ") + "]";
	var candidates = document.evaluate(xpath, document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);

	for (var cand = null, i = 0; (cand = candidates.snapshotItem(i)); i++) {
		if (urlRegex.test(cand.nodeValue)) {
			var span = document.createElement("span");

			// there might be non-encoded HTML characters in the candidate's text,
			// and we need to encode them. easiest way to do this is to add them to
			// the document as text and then retrieve innerHTML
			cand.parentNode.replaceChild(span, cand);
			span.appendChild(cand);

            var source = span.innerHTML;
            span.removeChild(cand);
            
            urlRegex.lastIndex = 0;
            for (var match = null, lastLastIndex = 0; (match = urlRegex.exec(source)); ) {
                span.appendChild(document.createTextNode(source.substring(lastLastIndex, match.index)));
                
                var a = document.createElement("a");
                a.setAttribute("href", match[0]);
                a.appendChild(document.createTextNode(match[0]));
                span.appendChild(a);

                lastLastIndex = urlRegex.lastIndex;
            }

            span.appendChild(document.createTextNode(source.substring(lastLastIndex)));
            span.normalize();
		}
	}

})();