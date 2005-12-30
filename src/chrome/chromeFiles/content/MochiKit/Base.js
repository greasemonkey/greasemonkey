/***

MochiKit.Base 1.1

See <http://mochikit.com/> for documentation, downloads, license, etc.

(c) 2005 Bob Ippolito.  All rights Reserved.

***/

if (typeof(dojo) != 'undefined') {
    dojo.provide("MochiKit.Base");
}

if (typeof(MochiKit) == 'undefined') {
    MochiKit = {};
}
if (typeof(MochiKit.Base) == 'undefined') {
    MochiKit.Base = {};
}

MochiKit.Base.VERSION = "1.1";
MochiKit.Base.NAME = "MochiKit.Base"
MochiKit.Base.update = function (self, obj/*, ... */) {
    /***

        Mutate an object by replacing its key:value pairs with those
        from other object(s).  Key:value pairs from later objects will
        overwrite those from earlier objects.
        
        If null is given as the initial object, a new one will be created.

        This mutates *and returns* the given object, be warned.

        A version of this function that creates a new object is available
        as merge(o1, o2, ...)

    ***/
    if (self == null) {
        self = {};
    }
    for (var i = 1; i < arguments.length; i++) {
        var o = arguments[i];
        if (typeof(o) != 'undefined' && o != null) {
            for (var k in o) {
                self[k] = o[k];
            }
        }
    }
    return self;
};

MochiKit.Base.update(MochiKit.Base, {
    __repr__: function () {
        return "[" + this.NAME + " " + this.VERSION + "]";
    },

    toString: function () {
        return this.__repr__();
    },

    counter: function (n/* = 1 */) {
        if (arguments.length == 0) {
            n = 1;
        }
        return function () {
            return n++;
        };
    },
        
    clone: function (obj) {
        var me = arguments.callee;
        if (arguments.length == 1) {
            me.prototype = obj;
            return new me();
        }
    },
            
    extend: function (self, obj, /* optional */skip) {
        /***

            Mutate an array by extending it with an array-like obj,
            starting with the "skip" index of obj.  If null is given
            as the initial array, a new one will be created.

            This mutates *and returns* the given array, be warned.

        ***/
        
        // Extend an array with an array-like object starting
        // from the skip index
        if (!skip) {
            skip = 0;
        }
        if (obj) {
            // allow iterable fall-through, but skip the full isArrayLike
            // check for speed, this is called often.
            var l = obj.length;
            if (typeof(l) != 'number' /* !isArrayLike(obj) */) {
                if (typeof(MochiKit.Iter) != "undefined") {
                    obj = MochiKit.Iter.list(obj);
                    l = obj.length;
                } else {
                    throw new TypeError("Argument not an array-like and MochiKit.Iter not present");
                }
            }
            if (!self) {
                self = [];
            }
            for (var i = skip; i < l; i++) {
                self.push(obj[i]);
            }
        }
        // This mutates, but it's convenient to return because
        // it's often used like a constructor when turning some
        // ghetto array-like to a real array
        return self;
    },


    updatetree: function (self, obj/*, ...*/) {
        if (self == null) {
            self = {};
        }
        for (var i = 1; i < arguments.length; i++) {
            var o = arguments[i];
            if (typeof(o) != 'undefined' && o != null) {
                for (var k in o) {
                    var v = o[k];
                    if (typeof(self[k]) == 'object' && typeof(v) == 'object') {
                        arguments.callee(self[k], v);
                    } else {
                        self[k] = v;
                    }
                }
            }
        }
        return self;
    },

    setdefault: function (self, obj/*, ...*/) {
        /***

            Mutate an object by replacing its key:value pairs with those
            from other object(s) IF they are not already set on the initial
            object.
            
            If null is given as the initial object, a new one will be created.

            This mutates *and returns* the given object, be warned.

        ***/
        if (self == null) {
            self = {};
        }
        for (var i = 1; i < arguments.length; i++) {
            var o = arguments[i];
            for (var k in o) {
                if (!(k in self)) {
                    self[k] = o[k];
                }
            }
        }
        return self;
    },

    keys: function (obj) {
        /***

            Return an array of the property names of an object
            (in no particular order).

        ***/
        var rval = [];
        for (var prop in obj) {
            rval.push(prop);
        }
        return rval;
    },
        
    items: function (obj) {
        /***

            Return an array of [propertyName, propertyValue] pairs for an
            object (in no particular order).

        ***/
        var rval = [];
        var e;
        for (var prop in obj) {
            var v;
            try {
                v = obj[prop];
            } catch (e) {
                continue;
            }
            rval.push([prop, v]);
        }
        return rval;
    },


    _newNamedError: function (module, name, func) {
        func.prototype = new MochiKit.Base.NamedError(module.NAME + "." + name);
        module[name] = func;
    },


    operator: {
        /***

            A table of JavaScript's operators for usage with map, filter, etc.

        ***/

        // unary logic operators
        truth: function (a) { return !!a; }, 
        lognot: function (a) { return !a; },
        identity: function (a) { return a; },

        // bitwise unary operators
        not: function (a) { return ~a; },
        neg: function (a) { return -a; },

        // binary operators
        add: function (a, b) { return a + b; },
        sub: function (a, b) { return a - b; },
        div: function (a, b) { return a / b; },
        mod: function (a, b) { return a % b; },

        // bitwise binary operators
        and: function (a, b) { return a & b; },
        or: function (a, b) { return a | b; },
        xor: function (a, b) { return a ^ b; },
        lshift: function (a, b) { return a << b; },
        rshift: function (a, b) { return a >> b; },
        zrshift: function (a, b) { return a >>> b; },

        // near-worthless build-in comparators
        eq: function (a, b) { return a == b; },
        ne: function (a, b) { return a != b; },
        gt: function (a, b) { return a > b; },
        ge: function (a, b) { return a >= b; },
        lt: function (a, b) { return a < b; },
        le: function (a, b) { return a <= b; },

        // compare comparators
        ceq: function (a, b) { return MochiKit.Base.compare(a, b) == 0; },
        cne: function (a, b) { return MochiKit.Base.compare(a, b) != 0; },
        cgt: function (a, b) { return MochiKit.Base.compare(a, b) == 1; },
        cge: function (a, b) { return MochiKit.Base.compare(a, b) != -1; },
        clt: function (a, b) { return MochiKit.Base.compare(a, b) == -1; },
        cle: function (a, b) { return MochiKit.Base.compare(a, b) != 1; },

        // binary logical operators
        logand: function (a, b) { return a && b; },
        logor: function (a, b) { return a || b; },
        contains: function (a, b) { return b in a; }
    },

    forward: function (func) {
        /***

        Returns a function that forwards a method call to this.func(...)

        ***/
        return function () {
            return this[func].apply(this, arguments);
        };
    },

    itemgetter: function (func) {
        /***

        Returns a function that returns arg[func]

        ***/
        return function (arg) {
            return arg[func];
        };
    },

    typeMatcher: function (/* typ */) {
        /***

        Given a set of types (as string arguments),
        returns a function that will return true if the types of the given
        objects are members of that set.

        ***/
        
        var types = {};
        for (var i = 0; i < arguments.length; i++) {
            var typ = arguments[i];
            types[typ] = typ;
        }
        return function () { 
            for (var i = 0; i < arguments.length; i++) {
                if (!(typeof(arguments[i]) in types)) {
                    return false;
                }
            }
            return true;
        };
    },

    isNull: function (/* ... */) {
        /***

        Returns true if all arguments are null.

        ***/
        for (var i = 0; i < arguments.length; i++) {
            if (arguments[i] != null) {
                return false;
            }
        }
        return true;
    },

    isUndefinedOrNull: function (/* ... */) {
        /***

            Returns true if all arguments are undefined or null

        ***/
        for (var i = 0; i < arguments.length; i++) {
            var o = arguments[i];
            if (!(typeof(o) == 'undefined' || o == null)) {
                return false;
            }
        }
        return true;
    },

    isNotEmpty: function (obj) {
        /***

            Returns true if all the array or string arguments
            are not empty

        ***/
        for (var i = 0; i < arguments.length; i++) {
            var o = arguments[i];
            if (!(o && o.length)) {
                return false;
            }
        }
        return true;
    },

    isArrayLike: function () {
        /***

            Returns true if all given arguments are Array-like

        ***/
        for (var i = 0; i < arguments.length; i++) {
            var o = arguments[i];
            var typ = typeof(o);
            if (
                (typ != 'object' && !(typ == 'function' && typeof(o.item) == 'function')) ||
                o == null ||
                typeof(o.length) != 'number'
            ) {
                return false;
            }
        }
        return true;
    },

    isDateLike: function () {
        /***

            Returns true if all given arguments are Date-like

        ***/
        for (var i = 0; i < arguments.length; i++) {
            var o = arguments[i];
            if (typeof(o) != "object" || typeof(o.getTime) != 'function') {
                return false;
            }
        }
        return true;
    },


    xmap: function (fn/*, obj... */) {
        /***
        
            Return an array composed of fn(obj) for every obj given as an
            argument.

            If fn is null, operator.identity is used.

        ***/
        if (fn == null) {
            return MochiKit.Base.extend(null, arguments, 1);
        }
        var rval = [];
        for (var i = 1; i < arguments.length; i++) {
            rval.push(fn(arguments[i]));
        }
        return rval;
    },

    map: function (fn, lst/*, lst... */) {
        /***

            Return a new array composed of the results of fn(x) for every x in
            lst

            If fn is null, and only one sequence argument is given the identity
            function is used.
            
                map(null, lst) -> lst.slice();

            If fn is null, and more than one sequence is given as arguments,
            then the Array function is used, making it equivalent to zip.

                map(null, p, q, ...)
                    -> zip(p, q, ...)
                    -> [[p0, q0, ...], [p1, q1, ...], ...];

        ***/
        var m = MochiKit.Base;
        var isArrayLike = m.isArrayLike;
        if (arguments.length <= 2) {
            // allow an iterable to be passed
            if (!isArrayLike(lst)) {
                if (MochiKit.Iter) {
                    // fast path for map(null, iterable)
                    lst = MochiKit.Iter.list(lst);
                    if (fn == null) {
                        return lst;
                    }
                } else {
                    throw new TypeError("Argument not an array-like and MochiKit.Iter not present");
                }
            }
            // fast path for map(null, lst)
            if (fn == null) {
                return m.extend(null, lst);
            }
            // disabled fast path for map(fn, lst)
            /*
            if (false && typeof(Array.prototype.map) == 'function') {
                // Mozilla fast-path
                return Array.prototype.map.call(lst, fn);
            }
            */
            var rval = [];
            for (var i = 0; i < lst.length; i++) {
                rval.push(fn(lst[i]));
            }
            return rval;
        } else {
            // default for map(null, ...) is zip(...)
            if (fn == null) {
                fn = Array;
            }
            var length = null;
            for (i = 1; i < arguments.length; i++) {
                // allow iterables to be passed
                if (!isArrayLike(arguments[i])) {
                    if (MochiKit.Iter) {
                        arguments[i] = MochiKit.Iter.list(arguments[i]);
                    } else {
                        throw new TypeError("Argument not an array-like and MochiKit.Iter not present");
                    }
                }
                // find the minimum length
                var l = arguments[i].length;
                if (length == null || length > l) {
                    length = l;
                }
            }
            rval = [];
            for (i = 0; i < length; i++) {
                var args = [];
                for (var j = 1; j < arguments.length; j++) {
                    args.push(arguments[j][i]);
                }
                rval.push(fn.apply(this, args));
            }
            return rval;
        }
    },

    xfilter: function (fn/*, obj... */) {
        var rval = [];
        if (fn == null) {
            fn = MochiKit.Base.operator.truth;
        }
        for (var i = 1; i < arguments.length; i++) {
            var o = arguments[i];
            if (fn(o)) {
                rval.push(o);
            }
        }
        return rval;
    },

    filter: function (fn, lst, self) {
        var rval = [];
        // allow an iterable to be passed
        var m = MochiKit.Base;
        if (!m.isArrayLike(lst)) {
            if (MochiKit.Iter) {
                lst = MochiKit.Iter.list(lst);
            } else {
                throw new TypeError("Argument not an array-like and MochiKit.Iter not present");
            }
        }
        if (fn == null) {
            fn = m.operator.truth;
        }
        if (typeof(Array.prototype.filter) == 'function') {
            // Mozilla fast-path
            return Array.prototype.filter.call(lst, fn, self);
        }
        else if (typeof(self) == 'undefined' || self == null) {
            for (var i = 0; i < lst.length; i++) {
                var o = lst[i];
                if (fn(o)) {
                    rval.push(o);
                }
            }
        } else {
            for (i = 0; i < lst.length; i++) {
                o = lst[i];
                if (fn.call(self, o)) {
                    rval.push(o);
                }
            }
        }
        return rval;
    },


    _wrapDumbFunction: function (func) {
        return function () {
            // fast path!
            switch (arguments.length) {
                case 0: return func();
                case 1: return func(arguments[0]);
                case 2: return func(arguments[0], arguments[1]);
                case 3: return func(arguments[0], arguments[1], arguments[2]);
            }
            var args = [];
            for (var i = 0; i < arguments.length; i++) {
                args.push("arguments[" + i + "]");
            }
            return eval("(func(" + args.join(",") + "))");
        };
    },
            
    bind: function (func, self/* args... */) {
        var im_func = func.im_func;
        var im_preargs = func.im_preargs;
        var im_self = func.im_self;
        var m = MochiKit.Base;
        if (typeof(func) == "function" && typeof(func.apply) == "undefined") {
            // this is for cases where JavaScript sucks ass and gives you a
            // really dumb built-in function like alert() that doesn't have
            // an apply
            func = m._wrapDumbFunction(func);
        }
        if (typeof(im_func) != 'function') {
            im_func = func;
        }
        if (typeof(self) != 'undefined') {
            im_self = self;
        }
        if (typeof(im_preargs) == 'undefined') {
            im_preargs = [];
        } else  {
            im_preargs = im_preargs.slice();
        }
        m.extend(im_preargs, arguments, 2);
        var newfunc = function () {
            var args = arguments;
            var me = arguments.callee;
            if (me.im_preargs.length > 0) {
                args = m.concat(me.im_preargs, args);
            }
            var self = me.im_self;
            if (!self) {
                self = this;
            }
            return me.im_func.apply(self, args);
        };
        newfunc.im_self = im_self;
        newfunc.im_func = im_func;
        newfunc.im_preargs = im_preargs;
        return newfunc;
    },

    bindMethods: function (self) {
        /***

            Bind all functions in self to self,
            which gives you a semi-Pythonic sort of instance.

        ***/
        var bind = MochiKit.Base.bind;
        for (var k in self) {
            var func = self[k];
            if (typeof(func) == 'function') {
                self[k] = bind(func, self);
            }
        }
    },

    registerComparator: function (name, check, comparator, /* optional */ override) {
        /***

            Register a comparator for use with the compare function.

            name should be a unique identifier describing the comparator.

            check is a function (a, b) that returns true if a and b
            can be compared with comparator.

            comparator is a function (a, b) that returns:

                 0 when a == b
                 1 when a > b
                -1 when a < b

            comparator is guaranteed to only be called if check(a, b)
            returns a true value.

            If override is given and true, then it will be made the
            highest precedence comparator.  Otherwise, the lowest.

        ***/
        MochiKit.Base.comparatorRegistry.register(name, check, comparator, override);
    },

    _primitives: {'bool': true, 'string': true, 'number': true},

    compare: function (a, b) {
        /***

            Compare two objects in a sensible manner.  Currently this is:
            
                1. undefined and null compare equal to each other
                2. undefined and null are less than anything else
                3. comparators registered with registerComparator are
                   used to find a good comparator.  Built-in comparators
                   are currently available for arrays and dates.
                4. Otherwise hope that the built-in comparison operators
                   do something useful, which should work for numbers
                   and strings.

            Returns what one would expect from a comparison function.

            returns:

                 0 when a == b
                 1 when a > b 
                -1 when a < b

        ***/
        if (a == b) {
            return 0;
        }
        var aIsNull = (typeof(a) == 'undefined' || a == null);
        var bIsNull = (typeof(b) == 'undefined' || b == null);
        if (aIsNull && bIsNull) {
            return 0;
        } else if (aIsNull) {
            return -1;
        } else if (bIsNull) {
            return 1;
        }
        var m = MochiKit.Base;
        // bool, number, string have meaningful comparisons
        var prim = m._primitives;
        if (!(typeof(a) in prim && typeof(b) in prim)) {
            try {
                return m.comparatorRegistry.match(a, b);
            } catch (e) {
                if (e != m.NotFound) {
                    throw e;
                }
            }
        }
        if (a < b) {
            return -1;
        } else if (a > b) {
            return 1;
        }
        // These types can't be compared
        var repr = m.repr;
        throw new TypeError(repr(a) + " and " + repr(b) + " can not be compared");
    },

    compareDateLike: function (a, b) {
        return MochiKit.Base.compare(a.getTime(), b.getTime());
    },

    compareArrayLike: function (a, b) {
        var compare = MochiKit.Base.compare;
        var count = a.length;
        var rval = 0;
        if (count > b.length) {
            rval = 1;
            count = b.length;
        } else if (count < b.length) {
            rval = -1;
        }
        for (var i = 0; i < count; i++) {
            var cmp = compare(a[i], b[i]);
            if (cmp) {
                return cmp;
            }
        }
        return rval;
    },

    registerRepr: function (name, check, wrap, /* optional */override) {
        /***

            Register a repr function.  repr functions should take
            one argument and return a string representation of it
            suitable for developers, primarily used when debugging.

            If override is given, it is used as the highest priority
            repr, otherwise it will be used as the lowest.

        ***/
        MochiKit.Base.reprRegistry.register(name, check, wrap, override);
    },

    repr: function (o) {
        /***

            Return a "programmer representation" for an object

        ***/

        if (typeof(o) == "undefined") {
            return "undefined";
        } else if (o === null) {
            return "null";
        }
        try {
            if (typeof(o.__repr__) == 'function') {
                return o.__repr__();
            } else if (typeof(o.repr) == 'function' && o.repr != arguments.callee) {
                return o.repr();
            }
            return MochiKit.Base.reprRegistry.match(o);
        } catch (e) {
            if (typeof(o.NAME) == 'string' && (
                    o.toString == Function.prototype.toString ||
                    o.toString == Object.prototype.toString
                )) {
                return o.NAME;
            }
        }
        try {
            var ostring = (o + "");
        } catch (e) {
            return "[" + typeof(o) + "]";
        }
        if (typeof(o) == "function") {
            o = ostring.replace(/^\s+/, "");
            var idx = o.indexOf("{");
            if (idx != -1) {
                o = o.substr(0, idx) + "{...}";
            }
        }
        return ostring;
    },

    reprArrayLike: function (o) {
        var m = MochiKit.Base;
        return "[" + m.map(m.repr, o).join(", ") + "]";
    },

    reprString: function (o) { 
        return ('"' + o.replace(/(["\\])/g, '\\$1') + '"'
            ).replace(/[\f]/g, "\\f"
            ).replace(/[\b]/g, "\\b"
            ).replace(/[\n]/g, "\\n"
            ).replace(/[\t]/g, "\\t"
            ).replace(/[\r]/g, "\\r");
    },

    reprNumber: function (o) {
        return o + "";
    },

    registerJSON: function (name, check, wrap, /* optional */override) {
        /***

            Register a JSON serialization function.  JSON serialization 
            functions should take one argument and return an object
            suitable for JSON serialization:

            - string
            - number
            - boolean
            - undefined
            - object
                - null
                - Array-like (length property that is a number)
                - Objects with a "json" method will have this method called
                - Any other object will be used as {key:value, ...} pairs
            
            If override is given, it is used as the highest priority
            JSON serialization, otherwise it will be used as the lowest.

        ***/
        MochiKit.Base.jsonRegistry.register(name, check, wrap, override);
    },


    evalJSON: function () {
        return eval("(" + arguments[0] + ")");
    },

    serializeJSON: function (o) {
        /***

            Create a JSON serialization of an object, note that this doesn't
            check for infinite recursion, so don't do that!

        ***/
        var objtype = typeof(o);
        if (objtype == "undefined") {
            return "undefined";
        } else if (objtype == "number" || objtype == "boolean") {
            return o + "";
        } else if (o === null) {
            return "null";
        }
        var m = MochiKit.Base;
        var reprString = m.reprString;
        if (objtype == "string") {
            return reprString(o);
        }
        // recurse
        var me = arguments.callee;
        // short-circuit for objects that support "json" serialization
        // if they return "self" then just pass-through...
        var newObj;
        if (typeof(o.__json__) == "function") {
            newObj = o.__json__();
            if (o !== newObj) {
                return me(newObj);
            }
        }
        if (typeof(o.json) == "function") {
            newObj = o.json();
            if (o !== newObj) {
                return me(newObj);
            }
        }
        // array
        if (objtype != "function" && typeof(o.length) == "number") {
            var res = [];
            for (var i = 0; i < o.length; i++) {
                var val = me(o[i]);
                if (typeof(val) != "string") {
                    val = "undefined";
                }
                res.push(val);
            }
            return "[" + res.join(",") + "]";
        }
        // look in the registry
        try {
            newObj = m.jsonRegistry.match(o);
            return me(newObj);
        } catch (e) {
            if (e != m.NotFound) {
                // something really bad happened
                throw e;
            }
        }
        // it's a function with no adapter, bad
        if (objtype == "function") {
            return null;
        }
        // generic object code path
        res = [];
        for (var k in o) {
            var useKey;
            if (typeof(k) == "number") {
                useKey = '"' + k + '"';
            } else if (typeof(k) == "string") {
                useKey = reprString(k);
            } else {
                // skip non-string or number keys
                continue;
            }
            val = me(o[k]);
            if (typeof(val) != "string") {
                // skip non-serializable values
                continue;
            }
            res.push(useKey + ":" + val);
        }
        return "{" + res.join(",") + "}";
    },
            

    objEqual: function (a, b) {
        /***
            
            Compare the equality of two objects.

        ***/
        return (MochiKit.Base.compare(a, b) == 0);
    },

    arrayEqual: function (self, arr) {
        /***

            Compare two arrays for equality, with a fast-path for length
            differences.

        ***/
        if (self.length != arr.length) {
            return false;
        }
        return (MochiKit.Base.compare(self, arr) == 0);
    },

    concat: function (/* lst... */) {
        /***

            Concatenates all given array-like arguments and returns
            a new array:

                var lst = concat(["1","3","5"], ["2","4","6"]);
                assert(lst.toString() == "1,3,5,2,4,6");

        ***/
        var rval = [];
        var extend = MochiKit.Base.extend;
        for (var i = 0; i < arguments.length; i++) {
            extend(rval, arguments[i]);
        }
        return rval;
    },

    keyComparator: function (key/* ... */) {
        /***

            A comparator factory that compares a[key] with b[key].
            e.g.:

                var lst = ["a", "bbb", "cc"];
                lst.sort(keyComparator("length"));
                assert(lst.toString() == "a,cc,bbb");

        ***/
        // fast-path for single key comparisons
        var m = MochiKit.Base;
        var compare = m.compare;
        if (arguments.length == 1) {
            return function (a, b) {
                return compare(a[key], b[key]);
            }
        }
        var compareKeys = m.extend(null, arguments);
        return function (a, b) {
            var rval = 0;
            // keep comparing until something is inequal or we run out of
            // keys to compare
            for (var i = 0; (rval == 0) && (i < compareKeys.length); i++) {
                var key = compareKeys[i];
                rval = compare(a[key], b[key]);
            }
            return rval;
        };
    },

    reverseKeyComparator: function (key) {
        /***

            A comparator factory that compares a[key] with b[key] in reverse.
            e.g.:

                var lst = ["a", "bbb", "cc"];
                lst.sort(reverseKeyComparator("length"));
                assert(lst.toString() == "bbb,cc,aa");

        ***/
        var comparator = MochiKit.Base.keyComparator.apply(this, arguments);
        return function (a, b) {
            return comparator(b, a);
        }
    },

    partial: function (func) {
        var m = MochiKit.Base;
        return m.bind.apply(this, m.extend([func, undefined], arguments, 1));
    },
     
    listMinMax: function (which, lst) {
        /***

            If which == -1 then it will return the smallest
            element of the array-like lst.  This is also available
            as:

                listMin(lst)


            If which == 1 then it will return the largest
            element of the array-like lst.  This is also available
            as:
                
                listMax(list)

        ***/
        if (lst.length == 0) {
            return null;
        }
        var cur = lst[0];
        var compare = MochiKit.Base.compare;
        for (var i = 1; i < lst.length; i++) {
            var o = lst[i];
            if (compare(o, cur) == which) {
                cur = o;
            }
        }
        return cur;
    },

    objMax: function (/* obj... */) {
        /***
        
            Return the maximum object out of the given arguments

        ***/
        return MochiKit.Base.listMinMax(1, arguments);
    },
            
    objMin: function (/* obj... */) {
        /***

            Return the minimum object out of the given arguments

        ***/
        return MochiKit.Base.listMinMax(-1, arguments);
    },

    nodeWalk: function (node, visitor) {
        /***

            Non-recursive generic node walking function (e.g. for a DOM)

            @param node: The initial node to be searched.

            @param visitor: The visitor function, will be called as
                            visitor(node), and should return an Array-like
                            of notes to be searched next (e.g.
                            node.childNodes).

        ***/
        var nodes = [node];
        var extend = MochiKit.Base.extend;
        while (nodes.length) {
            var res = visitor(nodes.shift());
            if (res) {
                extend(nodes, res);
            }
        }
    },

       
    nameFunctions: function (namespace) {
        var base = namespace.NAME;
        if (typeof(base) == 'undefined') {
            base = '';
        } else {
            base = base + '.';
        }
        for (var name in namespace) {
            var o = namespace[name];
            if (typeof(o) == 'function' && typeof(o.NAME) == 'undefined') {
                try {
                    o.NAME = base + name;
                } catch (e) {
                    // pass
                }
            }
        }
    },


    queryString: function (names, values) {
        // check to see if names is a string or a DOM element, and if
        // MochiKit.DOM is available.  If so, drop it like it's a form
        // Ugliest conditional in MochiKit?  Probably!
        if (typeof(MochiKit.DOM) != "undefined" && arguments.length == 1
            && (typeof(names) == "string" || (
                typeof(names.nodeType) != "undefined" && names.nodeType > 0
            ))
        ) {
            var kv = MochiKit.DOM.formContents(names);
            names = kv[0];
            values = kv[1];
        } else if (arguments.length == 1) {
            var o = names;
            names = [];
            values = [];
            for (var k in o) {
                var v = o[k];
                if (typeof(v) != "function") {
                    names.push(k);
                    values.push(v);
                }
            }
        }
        var rval = [];
        var len = Math.min(names.length, values.length);
        var urlEncode = MochiKit.Base.urlEncode;
        for (var i = 0; i < len; i++) {
            v = values[i];
            if (typeof(v) != 'undefined' && v != null) {
                rval.push(urlEncode(names[i]) + "=" + urlEncode(v));
            }
        }
        return rval.join("&");
    },


    parseQueryString: function (encodedString, useArrays) {
        var pairs = encodedString.replace(/\+/g, "%20").split("&");
        var o = {};
        var decode;
        if (typeof(decodeURIComponent) != "undefined") {
            decode = decodeURIComponent;
        } else {
            decode = unescape;
        }
        if (useArrays) {
            for (var i = 0; i < pairs.length; i++) {
                var pair = pairs[i].split("=");
                var name = decode(pair[0]);
                var arr = o[name];
                if (!(arr instanceof Array)) {
                    arr = [];
                    o[name] = arr;
                }
                arr.push(decode(pair[1]));
            }
        } else {
            for (i = 0; i < pairs.length; i++) {
                pair = pairs[i].split("=");
                o[decode(pair[0])] = decode(pair[1]);
            }
        }
        return o;
    }
});
    
MochiKit.Base.AdapterRegistry = function () {
    /***

        A registry to facilitate adaptation.

        Pairs is an array of [name, check, wrap] triples
        
        All check/wrap functions in this registry should be of the same arity.

    ***/
    this.pairs = [];
};

MochiKit.Base.AdapterRegistry.prototype = {
    register: function (name, check, wrap, /* optional */ override) {
        /***
            
            The check function should return true if the given arguments are
            appropriate for the wrap function.

            If override is given and true, the check function will be given
            highest priority.  Otherwise, it will be the lowest priority
            adapter.

        ***/

        if (override) {
            this.pairs.unshift([name, check, wrap]);
        } else {
            this.pairs.push([name, check, wrap]);
        }
    },

    match: function (/* ... */) {
        /***

            Find an adapter for the given arguments.
            
            If no suitable adapter is found, throws NotFound.

        ***/
        for (var i = 0; i < this.pairs.length; i++) {
            var pair = this.pairs[i];
            if (pair[1].apply(this, arguments)) {
                return pair[2].apply(this, arguments);
            }
        }
        throw MochiKit.Base.NotFound;
    },

    unregister: function (name) {
        /***

            Remove a named adapter from the registry

        ***/
        for (var i = 0; i < this.pairs.length; i++) {
            var pair = this.pairs[i];
            if (pair[0] == name) {
                this.pairs.splice(i, 1);
                return true;
            }
        }
        return false;
    }
};


MochiKit.Base.EXPORT = [
    "counter",
    "clone",
    "extend",
    "update",
    "updatetree",
    "setdefault",
    "keys",
    "items",
    "NamedError",
    "operator",
    "forward",
    "itemgetter",
    "typeMatcher",
    "isCallable",
    "isUndefined",
    "isUndefinedOrNull",
    "isNull",
    "isNotEmpty",
    "isArrayLike",
    "isDateLike",
    "xmap",
    "map",
    "xfilter",
    "filter",
    "bind",
    "bindMethods",
    "NotFound",
    "AdapterRegistry",
    "registerComparator",
    "compare",
    "registerRepr",
    "repr",
    "objEqual",
    "arrayEqual",
    "concat",
    "keyComparator",
    "reverseKeyComparator",
    "partial",
    "merge",
    "listMinMax",
    "listMax",
    "listMin",
    "objMax",
    "objMin",
    "nodeWalk",
    "zip",
    "urlEncode",
    "queryString",
    "serializeJSON",
    "registerJSON",
    "evalJSON",
    "parseQueryString"
];

MochiKit.Base.EXPORT_OK = [
    "nameFunctions",
    "comparatorRegistry",
    "reprRegistry",
    "jsonRegistry",
    "compareDateLike",
    "compareArrayLike",
    "reprArrayLike",
    "reprString",
    "reprNumber"
];

MochiKit.Base._exportSymbols = function (globals, module) {
    if ((typeof(JSAN) == 'undefined' && typeof(dojo) == 'undefined')
        || (typeof(MochiKit.__compat__) == 'boolean' && MochiKit.__compat__)) {
        var all = module.EXPORT_TAGS[":all"];
        for (var i = 0; i < all.length; i++) {
            globals[all[i]] = module[all[i]];
        }
    }
};

MochiKit.Base.__new__ = function () {
    // A singleton raised when no suitable adapter is found
    var m = this;
    if (typeof(encodeURIComponent) != "undefined") {
        m.urlEncode = function (unencoded) {
            return encodeURIComponent(unencoded).replace(/\'/g, '%27');
        };
    } else {
        m.urlEncode = function (unencoded) {
            return escape(unencoded
                ).replace(/\+/g, '%2B'
                ).replace(/\"/g,'%22'
                ).rval.replace(/\'/g, '%27');
        };
    }

    m.NamedError = function (name) {
        this.message = name;
        this.name = name;
    };
    m.NamedError.prototype = new Error();
    m.update(m.NamedError.prototype, {
        repr: function () {
            if (this.message && this.message != this.name) {
                return this.name + "(" + m.repr(this.message) + ")";
            } else {
                return this.name + "()";
            }
        },
        toString: m.forward("repr")
    });

    m.NotFound = new m.NamedError("MochiKit.Base.NotFound");


    m.listMax = m.partial(m.listMinMax, 1);
    m.listMin = m.partial(m.listMinMax, -1);

    m.isCallable = m.typeMatcher('function');
    m.isUndefined = m.typeMatcher('undefined');

    m.merge = m.partial(m.update, null);
    m.zip = m.partial(m.map, null);

    m.comparatorRegistry = new m.AdapterRegistry();
    m.registerComparator("dateLike", m.isDateLike, m.compareDateLike);
    m.registerComparator("arrayLike", m.isArrayLike, m.compareArrayLike);

    m.reprRegistry = new m.AdapterRegistry();
    m.registerRepr("arrayLike", m.isArrayLike, m.reprArrayLike);
    m.registerRepr("string", m.typeMatcher("string"), m.reprString);
    m.registerRepr("numbers", m.typeMatcher("number", "boolean"), m.reprNumber);

    m.jsonRegistry = new m.AdapterRegistry();

    var all = m.concat(m.EXPORT, m.EXPORT_OK);
    m.EXPORT_TAGS = {
        ":common": m.concat(m.EXPORT_OK),
        ":all": all
    };

    m.nameFunctions(this);

};

MochiKit.Base.__new__();

//
// XXX: Internet Explorer blows
//
compare = MochiKit.Base.compare;

MochiKit.Base._exportSymbols(this, MochiKit.Base);
