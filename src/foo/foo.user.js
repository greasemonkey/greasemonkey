// ==UserScript==
// @name          Foo
// @namespace     http://www.greasespot.net/
// @description   Foo'in around
// @include       http://wiki.greasespot.net/*
// @resource      fooCon1 foo1.png
// @resource      fooCon2 Foo2.png
// @resource      fooCon3 foo3.jpg
// @resource      fooSource foo1.js
// @require       foo1.js
// @require       Foo2.js
// ==/UserScript==

(function()
{
  if ( confirm( 'Are you sure you want to run these tests?' ) ) {

    const scriptName = "foo.user.js";

    alert('> ' + scriptName);
    GM_log('> ' + scriptName);

      GM_setValue('test1', scriptName );
      GM_setValue('test2', 31415 );
      GM_setValue('test3', true );

      GM_log('< test1: ' + GM_getValue('test1', ""));
      GM_log('< test2: ' + GM_getValue('test2', 0));
      GM_log('< test3: ' + GM_getValue('test3', undefined));

      GM_log('>< test4: ' + GM_getValue('test4', "nofoo"));
      GM_log('>< test5: ' + GM_getValue('test5', 8675309));
      GM_log('>< test6: ' + GM_getValue('test6', false));

      GM_log('>< test7: ' + GM_getValue('test7', undefined));
      GM_log('>< test8: ' + GM_getValue('test8', null));

      GM_openInTab( 'http://www.google.com/' );
      GM_log('>< test9: Enough google?');

      GM_addStyle("body { color:white; background-color:black }");
      GM_log('>< test10: body inversion');

      GM_registerMenuCommand(
        "Important Message (jJ)",
        function() {
          alert( "BOO!" ); // And if you're reading this now, you're CHEATING!!! but good for you! ;D
        },
        "j",
        "control alt shift",
        "j"
      );
      alert( 'Please press ctrl-alt-shift + j to see an important message later' );

      alert( 'This next test you will need Live http headers add-on open\n' +
            'to examine the headers after a brief message from the Monkey source.' );

      GM_xmlhttpRequest({
        method:"GET",
        url:"http://www.greasespot.net/",
        headers:{
          "User-Agent":"Mozilla/5.0",            // Recommend using navigator.userAgent when possible
          "Accept":"text/xml"
        },
        onload:function(response) {
          alert([
            response.status,
            response.statusText,
            response.readyState,
            response.responseHeaders,
            response.responseText
          ].join("\n"));
        }
      });

      alert( GM_getResourceText( "fooSource" ) );

      var fooCon1 = GM_getResourceURL("fooCon1");
      var fooCon2 = GM_getResourceURL("fooCon2");
      var fooCon3 = GM_getResourceURL("fooCon3");

      if ( confirm( 'Are you sure you want to continue to run these tests?' ) ) {
        document.open();
        document.write( "<html>" +
                          "<h1>It's as easy as</h1>" +
                            "<body>" +
                              "<img src=" + fooCon1 + " /><img src=" + fooCon2 + " /><img src=" + fooCon3 + " />" +
                            "</body>" +
                        "</html>" );
        document.close();
      }

    GM_log( '< ' + scriptName );
    alert( '< ' + scriptName );
  }
})();
