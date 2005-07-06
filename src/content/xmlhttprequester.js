/*
=== START LICENSE ===

Copyright 2004-2005 Aaron Boodman

Contributors:
Jeremy Dunck, Nikolas Coukouma, Matthew Gray.

Permission is hereby granted, free of charge, to any person obtaining a copy 
of this software and associated documentation files (the "Software"), to deal 
in the Software without restriction, including without limitation the rights 
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell 
copies of the Software, and to permit persons to whom the Software is 
furnished to do so, subject to the following conditions:

Note that this license applies only to the Greasemonkey extension source 
files, not to the user scripts which it runs. User scripts are licensed 
separately by their authors.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE 
SOFTWARE.

=== END LICENSE ===

The above copyright notice and this permission notice shall be included in all 
copies or substantial portions of the Software.
*/

function GM_xmlhttpRequester(contentWindow, chromeWindow) {
  this.chromeWindow = chromeWindow;
  this.contentWindow = contentWindow;
}

// this function gets called by user scripts in content security scope to
// start a cross-domain xmlhttp request.
//
// details should look like: 
// {method,url,onload,onerror,onreadystatechange,headers,data}
// headers should be in the form {name:value,name:value,etc}
// can't support mimetype because i think it's only used for forcing
// text/xml and we can't support that
GM_xmlhttpRequester.prototype.contentStartRequest = function(details) {
  // don't actually need the timer functionality, but this pops it 
  // out into chromeWindow's thread so that we get that security 
  // context.
  this.chromeWindow.setTimeout(
    GM_hitch(this, "chromeStartRequest", details), 0);
}

// this function is intended to be called in chrome's security context, so 
// that it can access other domains without security warning
GM_xmlhttpRequester.prototype.chromeStartRequest = function(details) {
  var req = new XMLHttpRequest();

  this.setupRequestEvent(this, req, "onload", details);
  this.setupRequestEvent(this, req, "onreadystatechange", details);
  this.setupRequestEvent(this, req, "onerror", details);

  req.open(details.method, details.url);

  if (details.headers) {
    for (var prop in details.headers) {
      req.setRequestHeader(prop, details.headers[prop]);
    }
  }

  req.send(details.data);
}

// arranges for the specified 'event' on xmlhttprequest 'req' to call the
// method by the same name which is a property of 'details' in the content
// window's security context.
GM_xmlhttpRequester.prototype.setupRequestEvent = 
function(requester, req, event, details) {
  if (details[event]) {
    req[event] = function() {
    var responseState = {
        // can't support responseXML because security won't
        // let the browser call properties on it
        responseText:req.responseText,
        readyState:req.readyState,
        responseHeaders:(req.readyState == 4 ? 
                         req.getAllResponseHeaders() : 
                         ''),
        status:(req.readyState == 4 ? req.status : 0),
        statusText:(req.readyState == 4 ? req.statusText : '')
      }
    
      // pop back onto browser thread and call event handler                    
      requester.contentWindow.setTimeout(
        GM_hitch(details, event, responseState), 0);
    }
  }
}
