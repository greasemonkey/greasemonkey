const EXPORTED_SYMBOLS = ['GM_util'];

/*
This "util" module separates all the methods into individual files, and lazily
imports them automatically, the first time each method is called.  Simply import
this top-level module:

Components.utils.import("resource://greasemonkey/util.js");

Then call one of its methods (e.g.):

GM_util.log('foo');

The module 'util/foo.js' will be imported, and the 'foo' function it defines
will be called for you.  In the future that method will exist directly.  Thus
all modules inside 'util/' should define and export exactly one function, with
the same name as the file.  All other contents are privates to that method's
module.
*/
var GM_util = {
  __noSuchMethod__ : function(aName, aArguments) {
    try {
      Components.utils.import('resource://greasemonkey/util/' + aName + '.js',
          GM_util);
      return GM_util[aName].apply(GM_util, aArguments);
    } catch (e) {
      throw new Error('Could not import util ' + aName + ':\n' + e);
    }
  }
}
