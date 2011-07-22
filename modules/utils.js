var EXPORTED_SYMBOLS = [
    'GM_memoize',
    'GM_uriFromUrl',
    ];


// Decorate a function with a memoization wrapper, with a limited-size cache
// to reduce peak memory utilization.  Simple usage:
//
// function foo(arg1, arg2) { /* complex operation */ }
// foo = GM_memoize(foo);
//
// The memoized function may have any number of arguments, but they must be
// be serializable, and uniquely.  It's safest to use this only on functions
// that accept primitives.
function GM_memoize(func, limit) {
  limit = limit || 3000;
  var cache = {__proto__: null};
  var keylist = [];

  return function(a) {
    var args = Array.prototype.slice.call(arguments);
    var key = uneval(args);
    if (key in cache) return cache[key];

    var result = func.apply(null, args);

    cache[key] = result;

    if (keylist.push(key) > limit) delete cache[keylist.shift()];

    return result;
  }
}


function GM_uriFromUrl(url, base) {
  var ioService = Components.classes["@mozilla.org/network/io-service;1"]
      .getService(Components.interfaces.nsIIOService);
  var baseUri = null;

  if (typeof base === "string") {
    baseUri = GM_uriFromUrl(base);
  } else if (base) {
    baseUri = base;
  }

  try {
    return ioService.newURI(url, null, baseUri);
  } catch (e) {
    return null;
  }
}
GM_uriFromUrl = GM_memoize(GM_uriFromUrl);
