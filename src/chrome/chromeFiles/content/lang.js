/**
 * lang.js - Language extensions not covered by MochiKit in here.
 */

/**
 * Returns true if the specified value is not |undefined|.
 */
function isDef(val) {
  return typeof val != "undefined";
}

/**
 * Returns true if the specified value is |null|
 */
function isNull(val) {
  return val === null;
}

/**
 * Returns true if the specified value is an array
 */
function isArray(val) {
  return isObject(val) && val.constructor == Array;
}

/**
 * Returns true if the specified value is a string
 */
function isString(val) {
  return typeof val == "string";
}

/**
 * Returns true if the specified value is a boolean
 */
function isBoolean(val) {
  return typeof val == "boolean";
}

/**
 * Returns true if the specified value is a number
 */
function isNumber(val) {
  return typeof val == "number";
}

/**
 * Returns true if the specified value is a function
 */
function isFunction(val) {
  return typeof val == "function";
}

/**
 * Returns true if the specified value is an object
 */
function isObject(val) {
  return val && typeof val == "object";
}

/**
 * Returns an array of all the properties defined on an object
 */
function getObjectProps(obj) {
  var ret = [];

  for (var p in obj) {
    ret.push(p);
  }

  return ret;
}

/**
 * Returns true if the specified value is an object which has no properties
 * defined.
 */
function isEmptyObject(val) {
  if (!isObject(val)) {
    return false;
  }

  for (var p in val) {
    return false;
  }

  return true;
}

/**
 * Does simple python-style string substitution. 
 * "foo%s hot%s".subs("bar", "dog") becomes "foobar hotdot".
 * For more fully-featured templating, see template.js.
 */
String.prototype.subs = function() {
  var ret = this;

  // this appears to be slow, but testing shows it compares more or less equiv.
  // to the regex.exec method.
  for (var i = 0; i < arguments.length; i++) {
    ret = ret.replace(/\%s/, arguments[i]);
  }

  return ret;
}

/**
 * Returns the last element on an array without removing it.
 */
Array.prototype.peek = function() {
  return this[this.length];
}

/**
 * Inherit the prototype methods from one constructor into another.
 *
 * Usage:
 * function ParentClass(a, b) { }
 * ParentClass.prototype.foo = function() { }
 *
 * function ChildClass(a, b, c) {
 *   ParentClass.call(this, a, b);
 * }
 *
 * ChildClass.inherits(ParentClass);
 *
 * var child = new ChildClass("a", "b", "see");
 * child.foo(); // works
 */
Function.prototype.inherits = function(parentCtor) {
  var tempCtor = function(){};
  tempCtor.prototype = parentCtor.prototype;
  this.prototype = new tempCtor();
}
