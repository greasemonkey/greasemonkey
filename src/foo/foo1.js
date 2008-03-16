alert( "foo1.js was here" );

const globalWarming = "is hot";

try {
  if ( GM_hitch )
    alert( "GM_hitch was here" );
} catch ( e ) { /* GOOD IF YOU DON'T SEE THIS ALERT */ }
