/*

All Music Guide corrector user script port

Original Copyright (C) 2004, Adrian Holovaty 
http://holovaty.com/blog/archive/2004/07/19/2210

User script update by Aaron Boodman
http://youngpup.net/2004/greasemonkey

This program is free software; you can redistribute it and/or modify it under
the terms of the GNU General Public License as published by the Free Software
Foundation; either version 2 of the License, or (at your option) any later
version.

This program is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
details.

You should have received a copy of the GNU General Public License along with
this program; if not, write to the Free Software Foundation, Inc., 59 Temple
Place, Suite 330, Boston, MA 02111-1307 USA

BUGS:

   Fix CSS problem on home page (ugly blue links) caused by fixing the JavaScript links
   Fix focus problem after "Read More (inline)" is clicked

WISHLIST:

   Songs table on album detail page should have longer "Title" field

*/

// userscript metadata follows...

// ==UserScript==
// @name			All Music Guide Corrector
// @namespace		http://youngpup.net/userscripts
// @description		A port of Adrian Holovaty's All Music Guide site-specific extension
// @include			http://www.allmusic.com*
// ==/UserScript==

(function() {

	var AllMusicCorrector = {
		checkPage: function() {
			// Check the current URL. If we're at www.allmusic.com, clean it up.
			if (/^http:\/\/(www\.)?allmusic\.com\//.exec(window._content.location.href)) {
				this.cleanUp();
			}
		},
		cleanUp: function () {
			// Hide the annoying Flash spinner thing.
			// We could use getElementById('flashspinner') here, but that method
			// causes the Flash object to flicker.
			window._content.document.getElementById('header').getElementsByTagName('span')[1].style.display='none';

			// Turn the JavaScript-only links into proper links.
			var as = window._content.document.getElementsByTagName('a');
			for (var i = as.length - 1; i >= 0; i--) {
				var oc = as[i].getAttribute('onclick');
				if (oc) {
					var ms = oc.match(/^z\('(.*?)'\)$/);
					if (ms) as[i].href = '/cg/amg.dll?p=amg&sql=' + ms[1];
				}
			}

			// If this is an artist or album detail page, change the "Read more"
			// link to pull in the full text dynamically.
			var bio = window._content.document.getElementById('bio');
			var review = window._content.document.getElementById('review');
			var preview_block = bio || review;
			if (preview_block) {
				var ps = preview_block.getElementsByTagName('p');
				if (ps && !window._content.document.read_more_set) {
					// Create the JavaScript function (readMoreInline()) that will
					// be called if the user clicks on "Read more".

					// First, get the "Read more" link, which is always the last
					// <a> tag in the review body.
					var as = ps[ps.length-1].getElementsByTagName('a');
					var last_a = as[as.length-1];

					// Check whether we have the correct "Read more" link. We might
					// be, for instance, on the full review page, in which case we
					// wouldn't want to do anything.
					if (last_a.innerHTML != 'Read More...') {
						return;
					}

					// Now create a JavaScript function that will be called when
					// the user clicks "Read more". This function does a separate
					// HTTP request to get the full text. Once it gets the text, it
					// replaces the short text on the current page with the longer
					// one. Finally, it replaces the ugly JavaScript links with
					// proper <a href>s.
					var script_src = 'function () {';
					script_src +=    'var xmlhttp=new XMLHttpRequest();';
					script_src +=    'xmlhttp.open("GET", "' + last_a.href + '", true);';
					script_src +=    'xmlhttp.onreadystatechange=function() {';
					script_src +=    '  if (xmlhttp.readyState == 4) {';
					script_src +=    '    var b = document.getElementById("' + preview_block.id + '");';
					script_src +=    '    b.innerHTML = /<div id="' + preview_block.id + '">([^`]*?)<\\/div>/.exec(xmlhttp.responseText)[1];';
					script_src +=    '    window.status="";';
										  // now clean up the links
					script_src +=    '    var as = b.getElementsByTagName("a");';
					script_src +=    '    for (var i=as.length-1; i>=0; i--) {';
					script_src +=    '      var oc = as[i].getAttribute("onclick");';
					script_src +=    '      if (oc) {';
					script_src +=    '        var ms = oc.match(/^z\\(\'(.*?)\'\\)$/);';
					script_src +=    '        if (ms) as[i].href = "/cg/amg.dll?p=amg&sql=" + ms[1];';
					script_src +=    '      }';
					script_src +=    '    }';
					script_src +=    '  }';
					script_src +=    '};';
					script_src +=    'window.status="Loading full ' + preview_block.id + ' from allmusic.com...";';
					script_src +=    'xmlhttp.send(null);'
					script_src +=    '}';

					// Change the href of the "Read more" link to our JavaScript.
					last_a.href = 'javascript:(' + script_src + ')()';

					// Keep track of the fact that the "Read more" has been set,
					// because the presence of <iframe>s causes cleanUp() to be run
					// twice.
					window._content.document.read_more_set = 1;
				}
			}
		}
	}

	AllMusicCorrector.checkPage();

})();