const EXPORTED_SYMBOLS = ['hitch'];

function hitch(obj, method) {
  if (obj && method && ('string' == typeof method)) {
    if (!obj[method]) {
      throw "method '" + method + "' does not exist on object '" + obj + "'";
    }
    method = obj[method];
  } else if ('function' == typeof method) {
    obj = obj || {};
  } else {
    throw "Invalid arguments to GM_util.hitch().";
  }

  var staticArgs = Array.prototype.splice.call(arguments, 2, arguments.length);

  return function() {
    // make a copy of staticArgs (don't modify it because it gets reused for
    // every invocation).
    var args = Array.prototype.slice.call(staticArgs);

    // add all the new arguments
    Array.prototype.push.apply(args, arguments);

    // invoke the original function with the correct this obj and the combined
    // list of static and dynamic arguments.
    return method.apply(obj, args);
  };
}
