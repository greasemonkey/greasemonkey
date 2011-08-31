const EXPORTED_SYMBOLS = ['memoize'];

// Decorate a function with a memoization wrapper, with a limited-size cache
// to reduce peak memory utilization.  Simple usage:
//
// function foo(arg1, arg2) { /* complex operation */ }
// foo = GM_util.memoize(foo);
//
// The memoized function may have any number of arguments, but they must be
// be serializable, and uniquely.  It's safest to use this only on functions
// that accept primitives.
function memoize(func, limit) {
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
