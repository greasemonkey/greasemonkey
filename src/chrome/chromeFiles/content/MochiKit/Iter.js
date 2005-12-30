/***

MochiKit.Iter 1.1

See <http://mochikit.com/> for documentation, downloads, license, etc.

(c) 2005 Bob Ippolito.  All rights Reserved.

***/
if (typeof(dojo) != 'undefined') {
    dojo.provide('MochiKit.Iter');
    dojo.require('MochiKit.Base');
}

if (typeof(JSAN) != 'undefined') {
    JSAN.use("MochiKit.Base", []);
}   

try {
    if (typeof(MochiKit.Base) == 'undefined') {
        throw "";
    }
} catch (e) {
    throw "MochiKit.Iter depends on MochiKit.Base!";
}  
            
if (typeof(MochiKit.Iter) == 'undefined') {
    MochiKit.Iter = {};
}           
        
MochiKit.Iter.NAME = "MochiKit.Iter";
MochiKit.Iter.VERSION = "1.1";
MochiKit.Base.update(MochiKit.Iter, {
    __repr__: function () {
        return "[" + this.NAME + " " + this.VERSION + "]";
    },
    toString: function () {
        return this.__repr__();
    },

    registerIteratorFactory: function (name, check, iterfactory, /* optional */ override) {
        /***

            Register an iterator factory for use with the iter function.

            check is a function (a) that returns true if a can be converted
            into an iterator with iterfactory.

            iterfactory is a function (a) that returns an object with a
            "next" function that returns the next value in the sequence.

            iterfactory is guaranteed to only be called if check(a)
            returns a true value.

            If override is given and true, then it will be made the
            highest precedence iterator factory.  Otherwise, the lowest.

        ***/

        MochiKit.Iter.iteratorRegistry.register(name, check, iterfactory, override);
    },

    iter: function (iterable, /* optional */ sentinel) {
        /***

            Convert the given argument to an iterator (object implementing
            "next").
            
            1. If iterable is an iterator (implements "next"), then it will be
               returned as-is.
            2. If iterable is an iterator factory (implements "iter"), then the
               result of iterable.iter() will be returned.
            3. Otherwise, the iterator factory registry is used to find a 
               match.
            4. If no factory is found, it will throw TypeError

            When used directly, using an iterator should look like this::

                var it = iter(iterable);
                try {
                    while (var o = it.next()) {
                        // use o
                    }
                } catch (e) {
                    if (e != StopIteration) {
                        throw e;
                    }
                    // pass
                }

        ***/
        
        var self = MochiKit.Iter;
        if (arguments.length == 2) {
            return self.takewhile(
                function (a) { return a != sentinel; },
                iterable
            );
        }
        if (typeof(iterable.next) == 'function') {
            return iterable;
        } else if (typeof(iterable.iter) == 'function') {
            return iterable.iter();
        }
        try {
            return self.iteratorRegistry.match(iterable);
        } catch (e) {
            var m = MochiKit.Base;
            if (e == m.NotFound) {
                e = new TypeError(typeof(iterable) + ": " + m.repr(iterable) + " is not iterable");
            }
            throw e;
        }
    },

    count: function (n) {
        /***

            count([n]) --> n, n + 1, n + 2, ...

        ***/
        if (!n) {
            n = 0;
        }
        var m = MochiKit.Base;
        return {
            repr: function () { return "count(" + n + ")"; },
            toString: m.forward("repr"),
            next: m.counter(n)
        };
    },

    cycle: function (p) {
        /***

            cycle(p) --> p0, p1, ... plast, p0, p1, ...

        ***/
        var self = MochiKit.Iter;
        var m = MochiKit.Base;
        var lst = [];
        var iterator = self.iter(p);
        return {
            repr: function () { return "cycle(...)"; },
            toString: m.forward("repr"),
            next: function () {
                try {
                    var rval = iterator.next();
                    lst.push(rval);
                    return rval;
                } catch (e) {
                    if (e != self.StopIteration) {
                        throw e;
                    }
                    if (lst.length == 0) {
                        this.next = function () {
                            throw self.StopIteration;
                        };
                    } else {
                        var i = -1;
                        this.next = function () {
                            i = (i + 1) % lst.length;
                            return lst[i];
                        }
                    }
                    return this.next();
                }
            }
        }
    },

    repeat: function (elem, /* optional */n) {
        /***
        
            repeat(elem, [,n]) --> elem, elem, elem, ... endlessly or up to n
                times

        ***/
        var m = MochiKit.Base;
        if (typeof(n) == 'undefined') {
            return {
                repr: function () {
                    return "repeat(" + m.repr(elem) + ")";
                },
                toString: m.forward("repr"),
                next: function () {
                    return elem;
                }
            };
        }
        return {
            repr: function () {
                return "repeat(" + m.repr(elem) + ", " + n + ")";
            },
            toString: m.forward("repr"),
            next: function () {
                if (n <= 0) {
                    throw MochiKit.Iter.StopIteration;
                }
                n -= 1;
                return elem;
            }
        };
    },
            
    next: function (iterator) {
        /***

            Return the next value from the iterator

        ***/
        return iterator.next();
    },

    izip: function (p, q/*, ...*/) {
        /***

            izip(p, q, ...) --> (p0, q0, ...), (p1, q1, ...), ...

        ***/
        var m = MochiKit.Base;
        var next = MochiKit.Iter.next;
        var iterables = m.map(iter, arguments);
        return {
            repr: function () { return "izip(...)"; },
            toString: m.forward("repr"),
            next: function () { return m.map(next, iterables); }
        };
    },

    ifilter: function (pred, seq) {
        /***

            ifilter(pred, seq) --> elements of seq where pred(elem) is true

        ***/
        var m = MochiKit.Base;
        seq = MochiKit.Iter.iter(seq);
        if (pred == null) {
            pred = m.operator.truth;
        }
        return {
            repr: function () { return "ifilter(...)"; },
            toString: m.forward("repr"),
            next: function () {
                while (true) {
                    var rval = seq.next();
                    if (pred(rval)) {
                        return rval;
                    }
                }
                // mozilla warnings aren't too bright
                return undefined;
            }
        }
    },

    ifilterfalse: function (pred, seq) {
        /***

            ifilterfalse(pred, seq) --> elements of seq where pred(elem) is
                false

        ***/
        var m = MochiKit.Base;
        seq = MochiKit.Iter.iter(seq);
        if (pred == null) {
            pred = m.operator.truth;
        }
        return {
            repr: function () { return "ifilterfalse(...)"; },
            toString: m.forward("repr"),
            next: function () {
                while (true) {
                    var rval = seq.next();
                    if (!pred(rval)) {
                        return rval;
                    }
                }
                // mozilla warnings aren't too bright
                return undefined;
            }
        }
    },
     
    islice: function (seq/*, [start,] stop[, step] */) {
        /***

            islice(seq, [start,] stop[, step])  --> elements from 
                seq[start:stop:step] (in Python slice syntax)

        ***/
        var self = MochiKit.Iter;
        var m = MochiKit.Base;
        seq = self.iter(seq);
        var start = 0;
        var stop = 0;
        var step = 1;
        var i = -1;
        if (arguments.length == 2) {
            stop = arguments[1];
        } else if (arguments.length == 3) {
            start = arguments[1];
            stop = arguments[2];
        } else {
            start = arguments[1];
            stop = arguments[2];
            step = arguments[3];
        }
        return {
            repr: function () {
                return "islice(" + ["...", start, stop, step].join(", ") + ")";
            },
            toString: m.forward("repr"),
            next: function () {
                var rval;
                while (i < start) {
                    rval = seq.next();
                    i++;
                }
                if (start >= stop) {
                    throw self.StopIteration;
                }
                start += step;
                return rval;
            }
        };
    },

    imap: function (fun, p, q/*, ...*/) {
        /***

            imap(fun, p, q, ...) --> fun(p0, q0, ...), fun(p1, q1, ...), ...

        ***/
        var m = MochiKit.Base;
        var self = MochiKit.Iter;
        var iterables = m.map(self.iter, m.extend(null, arguments, 1));
        var map = m.map;
        var next = self.next;
        return {
            repr: function () { return "imap(...)"; },
            toString: m.forward("repr"),
            next: function () {
                return fun.apply(this, map(next, iterables));
            }
        };
    },
        
    applymap: function (fun, seq, self) {
        /***

            applymap(fun, seq) -->
                fun.apply(self, seq0), fun.apply(self, seq1), ...

        ***/
        seq = MochiKit.Iter.iter(seq);
        var m = MochiKit.Base;
        return {
            repr: function () { return "applymap(...)"; },
            toString: m.forward("repr"),
            next: function () {
                return fun.apply(self, seq.next());
            }
        };
    },

    chain: function (p, q/*, ...*/) {
        /***

            chain(p, q, ...) --> p0, p1, ... plast, q0, q1, ...

        ***/
        // dumb fast path
        var self = MochiKit.Iter;
        var m = MochiKit.Base;
        if (arguments.length == 1) {
            return self.iter(arguments[0]);
        }
        var argiter = m.map(self.iter, arguments);
        return {
            repr: function () { return "chain(...)"; },
            toString: m.forward("repr"),
            next: function () {
                while (argiter.length > 1) {
                    try {
                        return argiter[0].next();
                    } catch (e) {
                        if (e != self.StopIteration) {
                            throw e;
                        }
                        argiter.shift();
                    }
                }
                if (argiter.length == 1) {
                    // optimize last element
                    var arg = argiter.shift();
                    this.next = m.bind(arg.next, arg);
                    return this.next();
                }
                throw self.StopIteration;
            }
        };
    },

    takewhile: function (pred, seq) {
        /***

            takewhile(pred, seq) --> seq[0], seq[1], ... until pred(seq[n])
                fails

        ***/
        var self = MochiKit.Iter;
        seq = self.iter(seq);
        return {
            repr: function () { return "takewhile(...)"; },
            toString: MochiKit.Base.forward("repr"),
            next: function () {
                var rval = seq.next();
                if (!pred(rval)) {
                    this.next = function () {
                        throw self.StopIteration;
                    };
                    this.next();
                }
                return rval;
            }
        };
    },

    dropwhile: function (pred, seq) {
        /***

            dropwhile(pred, seq) --> seq[n], seq[n + 1], starting when
                pred(seq[n]) fails

        ***/
        seq = MochiKit.Iter.iter(seq);
        var m = MochiKit.Base;
        var bind = m.bind;
        return {
            "repr": function () { return "dropwhile(...)"; },
            "toString": m.forward("repr"),
            "next": function () {
                while (true) {
                    var rval = seq.next();
                    if (!pred(rval)) {
                        break;
                    }
                }
                this.next = bind(seq.next, seq);
                return rval;
            }
        };
    },

    _tee: function (ident, sync, iterable) {
        sync.pos[ident] = -1;
        var m = MochiKit.Base;
        var listMin = m.listMin;
        return {
            repr: function () { return "tee(" + ident + ", ...)"; },
            toString: m.forward("repr"),
            next: function () {
                var rval;
                var i = sync.pos[ident];

                if (i == sync.max) {
                    rval = iterable.next();
                    sync.deque.push(rval);
                    sync.max += 1;
                    sync.pos[ident] += 1;
                } else {
                    rval = sync.deque[i - sync.min];
                    sync.pos[ident] += 1;
                    if (i == sync.min && listMin(sync.pos) != sync.min) {
                        sync.min += 1;
                        sync.deque.shift();
                    }
                }
                return rval;
            }
        };
    },

    tee: function (iterable, n/* = 2 */) {
        /***

            tee(it, n=2) --> (it1, it2, it3, ... itn) splits one iterator
                into n

        ***/
        var rval = [];
        var sync = {
            "pos": [],
            "deque": [],
            "max": -1,
            "min": -1
        };
        if (arguments.length == 1) {
            n = 2;
        }
        var self = MochiKit.Iter;
        iterable = self.iter(iterable);
        var _tee = self._tee;
        for (var i = 0; i < n; i++) {
            rval.push(_tee(i, sync, iterable));
        }
        return rval;
    },

    list: function (iterable) {
        /***

            Convert an iterable to a new array

        ***/

        // Fast-path for Array and Array-like
        var m = MochiKit.Base;
        if (typeof(iterable.slice) == 'function') {
            return iterable.slice();
        } else if (m.isArrayLike(iterable)) {
            return m.concat(iterable);
        }

        var self = MochiKit.Iter;
        iterable = self.iter(iterable);
        var rval = [];
        try {
            while (true) {
                rval.push(iterable.next());
            }
        } catch (e) {
            if (e != self.StopIteration) {
                throw e;
            }
            return rval;
        }
        // mozilla warnings aren't too bright
        return undefined;
    },

        
    reduce: function (fn, iterable, /* optional */initial) {
        /***
        
            Apply a fn = function (a, b) cumulatively to the items of an
            iterable from left to right, so as to reduce the iterable
            to a single value.

            For example::
            
                reduce(function (a, b) { return x + y; }, [1, 2, 3, 4, 5])

            calculates::

                ((((1 + 2) + 3) + 4) + 5).
            
            If initial is given, it is placed before the items of the sequence
            in the calculation, and serves as a default when the sequence is
            empty.

            Note that the above example could be written more clearly as::

                reduce(operator.add, [1, 2, 3, 4, 5])

            Or even simpler::

                sum([1, 2, 3, 4, 5])

        ***/
        var i = 0;
        var x = initial;
        var self = MochiKit.Iter;
        iterable = self.iter(iterable);
        if (arguments.length < 3) {
            try {
                x = iterable.next();
            } catch (e) {
                if (e == self.StopIteration) {
                    e = new TypeError("reduce() of empty sequence with no initial value");
                }
                throw e;
            }
            i++;
        }
        try {
            while (true) {
                x = fn(x, iterable.next());
            }
        } catch (e) {
            if (e != self.StopIteration) {
                throw e;
            }
        }
        return x;
    },

    range: function (/* [start,] stop[, step] */) {
        /***

        Return an iterator containing an arithmetic progression of integers.
        range(i, j) returns iter([i, i + 1, i + 2, ..., j - 1]);
        start (!) defaults to 0.  When step is given, it specifies the
        increment (or decrement).  For example, range(4) returns
        iter([0, 1, 2, 3]).  The end point is omitted!  These are exactly the
        valid elements for an array of 4 elements.

        ***/
        var start = 0;
        var stop = 0;
        var step = 1;
        if (arguments.length == 1) {
            stop = arguments[0];
        } else if (arguments.length == 2) {
            start = arguments[0];
            stop = arguments[1];
        } else if (arguments.length == 3) {
            start = arguments[0];
            stop = arguments[1];
            step = arguments[2];
        } else {
            throw new TypeError("range() takes 1, 2, or 3 arguments!");
        }
        if (step == 0) {
            throw new TypeError("range() step must not be 0");
        }
        return {
            next: function () {
                if ((step > 0 && start >= stop) || (step < 0 && start <= stop)) {
                    throw MochiKit.Iter.StopIteration;
                }
                var rval = start;
                start += step;
                return rval;
            },
            repr: function () {
                return "range(" + [start, stop, step].join(", ") + ")";
            },
            toString: MochiKit.Base.forward("repr")
        };
    },
            
    sum: function (iterable, start/* = 0 */) {
        /***

        Returns the sum of a sequence of numbers (NOT strings) plus the value
        of parameter 'start' (with a default of 0).  When the sequence is
        empty, returns start.

        Equivalent to::

            reduce(operator.add, iterable, start);

        ***/
        var x = start || 0;
        var self = MochiKit.Iter;
        iterable = self.iter(iterable);
        try {
            while (true) {
                x += iterable.next();
            }
        } catch (e) {
            if (e != self.StopIteration) {
                throw e;
            }
        }
        return x;
    },
            
    exhaust: function (iterable) {
        /***

            Exhausts an iterable without saving the results anywhere,
            like list(iterable) when you don't care what the output is.

        ***/

        var self = MochiKit.Iter;
        iterable = self.iter(iterable);
        try {
            while (true) {
                iterable.next();
            }
        } catch (e) {
            if (e != self.StopIteration) {
                throw e;
            }
        }
    },

    forEach: function (iterable, func, /* optional */self) {
        /***
        
            Call func for each item in iterable.

        ***/
        var m = MochiKit.Base;
        if (arguments.length > 2) {
            func = m.bind(func, self);
        }
        // fast path for array
        if (m.isArrayLike(iterable)) {
            for (var i = 0; i < iterable.length; i++) {
                func(iterable[i]);
            }
        } else {
            self = MochiKit.Iter;
            self.exhaust(self.imap(func, iterable));
        }
    },

    every: function (iterable, func) {
        /***

            Return true if func(item) is true for every item in iterable

        ***/
        var self = MochiKit.Iter;
        try {
            self.ifilterfalse(func, iterable).next();
            return false;
        } catch (e) {
            if (e != self.StopIteration) {
                throw e;
            }
            return true;
        }
    },

    sorted: function (iterable, /* optional */cmp) {
        /***

            Return a sorted array from iterable

        ***/
        var rval = MochiKit.Iter.list(iterable);
        if (arguments.length == 1) {
            cmp = MochiKit.Base.compare;
        }
        rval.sort(cmp);
        return rval;
    },

    reversed: function (iterable) {
        /***

            Return a reversed array from iterable.

        ***/
        var rval = MochiKit.Iter.list(iterable);
        rval.reverse();
        return rval;
    },

    some: function (iterable, func) {
        /***

            Return true if func(item) is true for at least one item in iterable

        ***/
        var self = MochiKit.Iter;
        try {
            self.ifilter(func, iterable).next();
            return true;
        } catch (e) {
            if (e != self.StopIteration) {
                throw e;
            }
            return false;
        }
    },

    iextend: function (lst, iterable) {
        /***
            
            Just like list(iterable), except it pushes results on lst
        
        ***/
        
        if (MochiKit.Base.isArrayLike(iterable)) {
            // fast-path for array-like
            for (var i = 0; i < iterable.length; i++) {
                lst.push(iterable[i]);
            }
        } else {
            var self = MochiKit.Iter;
            iterable = self.iter(iterable);
            try {
                while (true) {
                    lst.push(iterable.next());
                }
            } catch (e) {
                if (e != self.StopIteration) {
                    throw e;
                }
            }
        }
        return lst;
    },

    groupby: function(iterable, /* optional */ keyfunc) {
        /***

            Like Python's itertools.groupby

        ***/
        var m = MochiKit.Base;
        var self = MochiKit.Iter;
        if (arguments.length < 2) {
            keyfunc = m.operator.identity;
        }
        iterable = self.iter(iterable);

        // shared
        var pk = undefined;
        var k = undefined;
        var v;

        function fetch() {
            v = iterable.next();
            k = keyfunc(v);
        };

        function eat() {
            var ret = v;
            v = undefined;
            return ret;
        };

        var first = true;
        return {
            repr: function () { return "groupby(...)"; },
            next: function() {
                // iterator-next

                // iterate until meet next group
                while (k == pk) {
                    fetch();
                    if (first) {
                        first = false;
                        break;
                    }
                }
                pk = k;
                return [k, {
                    next: function() {
                        // subiterator-next
                        if (v == undefined) { // Is there something to eat?
                            fetch();
                        }
                        if (k != pk) {
                            throw self.StopIteration;
                        }
                        return eat();
                    }
                }];
            }
        };
    },

    groupby_as_array: function (iterable, /* optional */ keyfunc) {
        /***

            Like groupby, but return array of [key, subarray of values]

        ***/
        var m = MochiKit.Base;
        var self = MochiKit.Iter;
        if (arguments.length < 2) {
            keyfunc = m.operator.identity;
        }

        iterable = self.iter(iterable);
        var result = [];
        var first = true;
        var prev_key;
        while (true) {
            try {
                var value = iterable.next();
                var key = keyfunc(value);
            } catch (e) {
                if (e == self.StopIteration) {
                    break;
                }
                throw e;
            }
            if (first || key != prev_key) {
                var values = [];
                result.push([key, values]);
            }
            values.push(value);
            first = false;
            prev_key = key;
        }
        return result;
    },

    arrayLikeIter: function (iterable) {
        var i = 0;
        return {
            repr: function () { return "arrayLikeIter(...)"; },
            toString: MochiKit.Base.forward("repr"),
            next: function () {
                if (i >= iterable.length) {
                    throw MochiKit.Iter.StopIteration;
                }
                return iterable[i++];
            }
        };
    },

    hasIterateNext: function (iterable) {
        return (iterable && typeof(iterable.iterateNext) == "function");
    },

    iterateNextIter: function (iterable) {
        return {
            repr: function () { return "iterateNextIter(...)"; },
            toString: MochiKit.Base.forward("repr"),
            next: function () {
                var rval = iterable.iterateNext();
                if (rval === null || rval === undefined) {
                    throw MochiKit.Iter.StopIteration;
                }
                return rval;
            }
        };
    }
});


MochiKit.Iter.EXPORT_OK = [
    "iteratorRegistry",
    "arrayLikeIter",
    "hasIterateNext",
    "iterateNextIter",
];

MochiKit.Iter.EXPORT = [
    "StopIteration",
    "registerIteratorFactory",
    "iter",
    "count",
    "cycle",
    "repeat",
    "next",
    "izip",
    "ifilter",
    "ifilterfalse",
    "islice",
    "imap",
    "applymap",
    "chain",
    "takewhile",
    "dropwhile",
    "tee",
    "list",
    "reduce",
    "range",
    "sum",
    "exhaust",
    "forEach",
    "every",
    "sorted",
    "reversed",
    "some",
    "iextend",
    "groupby",
    "groupby_as_array"
];

MochiKit.Iter.__new__ = function () {
    var m = MochiKit.Base;
    this.StopIteration = new m.NamedError("StopIteration");
    this.iteratorRegistry = new m.AdapterRegistry();
    // Register the iterator factory for arrays
    this.registerIteratorFactory(
        "arrayLike",
        m.isArrayLike,
        this.arrayLikeIter
    );

    this.registerIteratorFactory(
        "iterateNext",
        this.hasIterateNext,
        this.iterateNextIter
    );

    this.EXPORT_TAGS = {
        ":common": this.EXPORT,
        ":all": m.concat(this.EXPORT, this.EXPORT_OK)
    };

    m.nameFunctions(this);
        
};

MochiKit.Iter.__new__();

//
// XXX: Internet Explorer blows
//
reduce = MochiKit.Iter.reduce;

MochiKit.Base._exportSymbols(this, MochiKit.Iter);
