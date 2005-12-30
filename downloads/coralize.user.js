// ==UserScript==
// @name          Coralize
// @namespace     http://dunck.us/userscripts
// @include       *
// @description	  Change links to use the Coral CDN (http://wiki.coralcdn.org/wiki.php)
// ==/UserScript==
// code borrowed heavily from http://coralcdn.org/bin/mozilla/coralize.xpi


(function() {
//http://foo.com/bar.html becomes
//http://foo.com.nyud.net:8090/bar.html.

    var coralPartsRegExp = new RegExp("^([^:]+:)?/{2,}([^:/]+)(:\[0-9]+)?/(.*)");
    var coralizedRegExp = new RegExp("^http://([^:/]+)\.nyud\.net:8090/");
    
    function checkCanCoralize(url) {
    	var reResults = coralizedRegExp.exec(url);
    	if (reResults != null) return false;  // already Coralized
    
    	reResults = coralPartsRegExp.exec(url);
    	if (reResults == null) return false;  // cannot be Coralized (not a URL?)
    	if (reResults[1] != "http:") return false;  // not HTTP
    
    	return true;
    }

    GM_registerMenuCommand("Coralize page", function() {
        var parts;
        var newLoc;
        
        if (!checkCanCoralize(document.location)) {
            alert("Can't coralize.");
            return;
        }
      
        parts = coralPartsRegExp.exec(document.location);
      
        if (parts[3] != null) {
        	var port = new String(parts[3]).substr(1);
        	newLoc = "http://"+parts[2]+"."+port+".nyud.net:8090/"+parts[4];
        }
        else {
        	newLoc = "http://"+parts[2]+".nyud.net:8090/"+parts[4];
        }
        
        document.location = newLoc;

      }
    );
})();
