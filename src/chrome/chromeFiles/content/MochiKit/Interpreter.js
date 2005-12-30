/***

MochiKit.Interpreter 1.1

See <http://mochikit.com/> for documentation, downloads, license, etc.

(c) 2005 Bob Ippolito.  All rights Reserved.

***/
if (typeof(dojo) != 'undefined') {
    dojo.provide('MochiKit.Interpreter');
    dojo.require('MochiKit.Base');
    dojo.require('MochiKit.Iter');
    dojo.require('MochiKit.DOM');
}

if (typeof(JSAN) != 'undefined') {
    JSAN.use("MochiKit.Base", []);
    JSAN.use("MochiKit.Iter", []);
    JSAN.use("MochiKit.DOM", []);
}

try {
    if (typeof(MochiKit.Base) == 'undefined' || typeof(MochiKit.Iter) == "undefined" || typeof(MochiKit.DOM) == "undefined") {
        throw "";
    }
} catch (e) {
    throw "MochiKit.Interpreter depends on MochiKit.Base, MochiKit.Iter and MochiKit.DOM!";
}

if (typeof(MochiKit.Interpreter) == 'undefined') {
    MochiKit.Interpreter = {};
}

MochiKit.Interpreter.NAME = "MochiKit.Interpreter";
MochiKit.Interpreter.VERSION = "1.1";
MochiKit.Interpreter.__repr__ = function () {
    return "[" + this.NAME + " " + this.VERSION + "]";
};

MochiKit.Interpreter.toString = function () {
    return this.__repr__();
};


MochiKit.Interpreter.EXPORT = [
];


MochiKit.Interpreter.EXPORT_OK = [
];


MochiKit.Interpreter.usefulUserAgent = function () {
    var _ua = MochiKit.DOM.currentWindow().navigator.userAgent;
    var ua = _ua.replace(/^Mozilla\/.*?\(.*?\)\s*/, "");
    if (ua == "") {
        // MSIE
        ua = _ua.replace(/^Mozilla\/4\.0 \(compatible; MS(IE .*?);.*$/, "$1");
    }
    return ua;
};

MochiKit.Interpreter.Context = {
    dir: function (o) { return MochiKit.Iter.sorted(MochiKit.Base.keys(o)); }
};

MochiKit.Interpreter.__new__ = function () {
    var m = MochiKit.Base;

    this.EXPORT_TAGS = {
        ":common": this.EXPORT,
        ":all": m.concat(this.EXPORT, this.EXPORT_OK)
    };

    m.nameFunctions(this);

};

MochiKit.Interpreter.__new__();

MochiKit.Base._exportSymbols(this, MochiKit.Interpreter);
