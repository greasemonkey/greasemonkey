/***

MochiKit.DOM 1.1

See <http://mochikit.com/> for documentation, downloads, license, etc.

(c) 2005 Bob Ippolito.  All rights Reserved.

***/

if (typeof(dojo) != 'undefined') {
    dojo.provide("MochiKit.DOM");
    dojo.require("MochiKit.Iter");
}
if (typeof(JSAN) != 'undefined') {
    JSAN.use("MochiKit.Iter", []);
}

try {
    if (typeof(MochiKit.Iter) == 'undefined') {
        throw "";
    }
} catch (e) {
    throw "MochiKit.DOM depends on MochiKit.Iter!";
}

if (typeof(MochiKit.DOM) == 'undefined') {
    MochiKit.DOM = {};
}

MochiKit.DOM.NAME = "MochiKit.DOM";
MochiKit.DOM.VERSION = "1.1";
MochiKit.DOM.__repr__ = function () {
    return "[" + this.NAME + " " + this.VERSION + "]";
};
MochiKit.DOM.toString = function () {
    return this.__repr__();
};

MochiKit.DOM.EXPORT = [
    "formContents",
    "currentWindow",
    "currentDocument",
    "withWindow",
    "withDocument",
    "registerDOMConverter",
    "coerceToDOM",
    "createDOM",
    "createDOMFunc",
    "getNodeAttribute",
    "setNodeAttribute",
    "updateNodeAttributes",
    "appendChildNodes",
    "replaceChildNodes",
    "removeElement",
    "swapDOM",
    "BUTTON",
    "TT",
    "PRE",
    "H1",
    "H2",
    "H3",
    "BR",
    "HR",
    "LABEL",
    "TEXTAREA",
    "FORM",
    "SELECT",
    "OPTION",
    "OPTGROUP",
    "LEGEND",
    "FIELDSET",
    "P",
    "UL",
    "OL",
    "LI",
    "TD",
    "TR",
    "THEAD",
    "TBODY",
    "TFOOT",
    "TABLE",
    "TH",
    "INPUT",
    "SPAN",
    "A",
    "DIV",
    "IMG",
    "getElement",
    "$",
    "computedStyle",
    "getElementsByTagAndClassName",
    "addToCallStack",
    "addLoadEvent",
    "focusOnLoad",
    "setElementClass",
    "toggleElementClass",
    "addElementClass",
    "removeElementClass",
    "swapElementClass",
    "hasElementClass",
    "escapeHTML",
    "toHTML",
    "emitHTML",
    "setDisplayForElement",
    "hideElement",
    "showElement",
    "scrapeText"
];

MochiKit.DOM.EXPORT_OK = [
    "domConverters"
];

MochiKit.DOM.currentWindow = function () {
    return MochiKit.DOM._window;
};

MochiKit.DOM.currentDocument = function () {
    return MochiKit.DOM._document;
};

MochiKit.DOM.withWindow = function (win, func) {
    var self = MochiKit.DOM;
    var oldDoc = self._document;
    var oldWin = self._win;
    var rval;
    try {
        self._window = win;
        self._document = win.document;
        rval = func();
    } catch (e) {
        self._window = oldWin;
        self._document = oldDoc;
        throw e;
    }
    self._window = oldWin;
    self._document = oldDoc;
    return rval;
};

MochiKit.DOM.formContents = function (elem/* = document */) {
    var names = [];
    var values = [];
    var m = MochiKit.Base;
    var self = MochiKit.DOM;
    if (typeof(elem) == "undefined" || elem == null) {
        elem = self._document;
    } else {
        elem = self.getElement(elem);
    }
    m.nodeWalk(elem, function (elem) {
        var name = elem.name;
        var value = elem.value;
        if (m.isNotEmpty(name, value)) {
            if (elem.tagName == "INPUT"
                && elem.type == "radio"
                && !elem.checked
            ) {
                return null;
            }
            names.push(name);
            values.push(value);
            return null;
        }
        return elem.childNodes;
    });
    return [names, values];
};

MochiKit.DOM.withDocument = function (doc, func) {
    var self = MochiKit.DOM;
    var oldDoc = self._document;
    var rval;
    try {
        self._document = doc;
        rval = func();
    } catch (e) {
        self._document = oldDoc;
        throw e;
    }
    self._document = oldDoc;
    return rval;
};

MochiKit.DOM.registerDOMConverter = function (name, check, wrap, /* optional */override) {
    /***

        Register an adapter to convert objects that match check(obj, ctx)
        to a DOM element, or something that can be converted to a DOM
        element (i.e. number, bool, string, function, iterable).

    ***/
    MochiKit.DOM.domConverters.register(name, check, wrap, override);
};

MochiKit.DOM.coerceToDOM = function (node, ctx) {
    /***

        Used internally by createDOM, coerces a node to null, a DOM object,
        or an iterable.

    ***/

    var im = MochiKit.Iter;
    var self = MochiKit.DOM;
    var iter = im.iter;
    var repeat = im.repeat;
    var imap = im.imap;
    var domConverters = self.domConverters;
    var coerceToDOM = self.coerceToDOM;
    var NotFound = MochiKit.Base.NotFound;
    while (true) {
        if (typeof(node) == 'undefined' || node == null) {
            return null;
        }
        if (typeof(node.nodeType) != 'undefined' && node.nodeType > 0) {
            return node;
        }
        if (typeof(node) == 'number' || typeof(node) == 'bool') {
            node = node.toString();
            // FALL THROUGH
        }
        if (typeof(node) == 'string') {
            return self._document.createTextNode(node);
        }
        if (typeof(node.toDOM) == 'function') {
            node = node.toDOM(ctx);
            continue;
        }
        if (typeof(node) == 'function') {
            node = node(ctx);
            continue;
        }

        // iterable
        var iterNodes = null;
        try {
            iterNodes = iter(node);
        } catch (e) {
            // pass
        }
        if (iterNodes) {
            return imap(
                coerceToDOM,
                iterNodes,
                repeat(ctx)
            );
        }

        // adapter
        try {
            node = domConverters.match(node, ctx);
            continue;
        } catch (e) {
            if (e != NotFound) {
                throw e;
            }
        }

        // fallback
        return self._document.createTextNode(node.toString());
    }
    // mozilla warnings aren't too bright
    return undefined;
};
    
MochiKit.DOM.setNodeAttribute = function (node, attr, value) {
    var o = {};
    o.attr = value;
    try {
        return MochiKit.DOM.updateNodeAttributes(node, o);
    } catch (e) {
    }
    return null;
};

MochiKit.DOM.getNodeAttribute = function (node, attr) {
    var self = MochiKit.DOM;
    var rename = self.attributeArray.renames[attr];
    node = self.getElement(node);
    try {
        if (rename) {
            return node[rename];
        }
        return node.getAttribute(attr);
    } catch (e) {
    }
    return null;
};

MochiKit.DOM.updateNodeAttributes = function (node, attrs) {
    var elem = node;
    var self = MochiKit.DOM;
    if (typeof(node) == 'string') {
        elem = self.getElement(node);
    }
    if (attrs) {
        var updatetree = MochiKit.Base.updatetree;
        if (self.attributeArray.compliant) {
            // not IE, good.
            for (var k in attrs) {
                var v = attrs[k];
                if (typeof(v) == 'object' && typeof(elem[k]) == 'object') {
                    updatetree(elem[k], v);
                } else if (k.substring(0, 2) == "on") {
                    if (typeof(v) == "string") {
                        v = new Function(v);
                    }
                    elem[k] = v;
                } else {
                    elem.setAttribute(k, v);
                }
            }
        } else {
            // IE is insane in the membrane
            var renames = self.attributeArray.renames;
            for (k in attrs) {
                v = attrs[k];
                var renamed = renames[k];
                if (typeof(renamed) == "string") {
                    elem[renamed] = v;
                } else if (typeof(elem[k]) == 'object' && typeof(v) == 'object') {
                    updatetree(elem[k], v);
                } else if (k.substring(0, 2) == "on") {
                    if (typeof(v) == "string") {
                        v = new Function(v);
                    }
                    elem[k] = v;
                } else {
                    elem.setAttribute(k, v);
                }
            }
        }
    }
    return elem;
};

MochiKit.DOM.appendChildNodes = function (node/*, nodes...*/) {
    var elem = node;
    var self = MochiKit.DOM;
    if (typeof(node) == 'string') {
        elem = self.getElement(node);
    }
    var nodeStack = [
        self.coerceToDOM(
            MochiKit.Base.extend(null, arguments, 1),
            elem
        )
    ];
    var iextend = MochiKit.Iter.iextend;
    while (nodeStack.length) {
        var n = nodeStack.shift();
        if (typeof(n) == 'undefined' || n == null) {
            // pass
        } else if (typeof(n.nodeType) == 'number') {
            elem.appendChild(n);
        } else {
            iextend(nodeStack, n);
        }
    }
    return elem;
};

MochiKit.DOM.replaceChildNodes = function (node/*, nodes...*/) {
    var elem = node;
    var self = MochiKit.DOM;
    if (typeof(node) == 'string') {
        elem = self.getElement(node);
        arguments[0] = elem;
    }
    var child;
    while ((child = elem.firstChild)) {
        elem.removeChild(child);
    }
    if (arguments.length < 2) {
        return elem;
    } else {
        return self.appendChildNodes.apply(this, arguments);
    }
};

MochiKit.DOM.createDOM = function (name, attrs/*, nodes... */) {
    /*

        Create a DOM fragment in a really convenient manner, much like
        Nevow's <http://nevow.com> stan.

    */

    var elem;
    var self = MochiKit.DOM;
    if (typeof(name) == 'string') {
        elem = self._document.createElement(name);
    } else {
        elem = name;
    }
    if (attrs) {
        self.updateNodeAttributes(elem, attrs);
    }
    if (arguments.length <= 2) {
        return elem;
    } else {
        var args = MochiKit.Base.extend([elem], arguments, 2);
        return self.appendChildNodes.apply(this, args);
    }
};

MochiKit.DOM.createDOMFunc = function (/* tag, attrs, *nodes */) {
    /***

        Convenience function to create a partially applied createDOM

        @param tag: The name of the tag

        @param attrs: Optionally specify the attributes to apply

        @param *notes: Optionally specify any children nodes it should have

        @rtype: function

    ***/
    var m = MochiKit.Base;
    return m.partial.apply(
        this,
        m.extend([MochiKit.DOM.createDOM], arguments)
    );
};

MochiKit.DOM.swapDOM = function (dest, src) {
    /***

        Replace dest in a DOM tree with src, returning src

        @param dest: a DOM element to be replaced

        @param src: the DOM element to replace it with
                    or null if the DOM element should be removed

        @rtype: a DOM element (src)

    ***/
    var self = MochiKit.DOM;
    dest = self.getElement(dest);
    var parent = dest.parentNode;
    if (src) {
        src = self.getElement(src);
        parent.replaceChild(src, dest);
    } else {
        parent.removeChild(dest);
    }
    return src;
};

MochiKit.DOM.getElement = function (id) {
    /***

        A small quick little function to encapsulate the getElementById
        method.  It includes a check to ensure we can use that method.

        If the id isn't a string, it will be returned as-is.

        Also available as $(...) for compatibility/convenience with "other"
        js frameworks (bah).

    ***/
    var self = MochiKit.DOM;
    if (arguments.length == 1) {
        return ((typeof(id) == "string") ? self._document.getElementById(id) : id);
    } else {
        return MochiKit.Base.map(self.getElement, arguments);
    }
};

MochiKit.DOM.computedStyle = function (htmlElement, cssProperty, mozillaEquivalentCSS) {
    if (arguments.length == 2) {
        mozillaEquivalentCSS = cssProperty;
    }   
    var self = MochiKit.DOM;
    var el = self.getElement(htmlElement);
    var document = self._document;
    if (!el || el == document) {
        return undefined;
    }
    if (el.currentStyle) {
        return el.currentStyle[cssProperty];
    }
    if (typeof(document.defaultView) == 'undefined') {
        return undefined;
    }
    if (document.defaultView == null) {
        return undefined;
    }
    var style = document.defaultView.getComputedStyle(el, null);
    if (typeof(style) == "undefined" || style == null) {
        return undefined;
    }
    return style.getPropertyValue(mozillaEquivalentCSS);
};

MochiKit.DOM.getElementsByTagAndClassName = function (tagName, className, /* optional */parent) {
    var self = MochiKit.DOM;
    if (typeof(tagName) == 'undefined' || tagName == null) {
        tagName = '*';
    }
    if (typeof(parent) == 'undefined' || parent == null) {
        parent = self._document;
    }
    parent = self.getElement(parent);
    var children = parent.getElementsByTagName(tagName) || self._document.all;
    if (typeof(className) == 'undefined' || className == null) {
        return MochiKit.Base.extend(null, children);
    }

    var elements = [];
    for (var i = 0; i < children.length; i++) {
        var child = children[i];
        var classNames = child.className.split(' ');
        for (var j = 0; j < classNames.length; j++) {
            if (classNames[j] == className) {
                elements.push(child);
                break;
            }
        }
    }

    return elements;
};

MochiKit.DOM._newCallStack = function (path, once) {
    var rval = function () {
        var callStack = arguments.callee.callStack;
        for (var i = 0; i < callStack.length; i++) {
            if (callStack[i].apply(this, arguments) === false) {
                break;
            }
        }
        if (once) {
            try {
                this[path] = null;
            } catch (e) {
                // pass
            }
        }
    };
    rval.callStack = [];
    return rval;
};

MochiKit.DOM.addToCallStack = function (target, path, func, once) {
    var self = MochiKit.DOM;
    var existing = target[path];
    var regfunc = existing;
    if (!(typeof(existing) == 'function' && typeof(existing.callStack) == "object" && existing.callStack != null)) {
        regfunc = self._newCallStack(path, once);
        if (typeof(existing) == 'function') {
            regfunc.callStack.push(existing);
        }
        target[path] = regfunc;
    }
    regfunc.callStack.push(func);
};

MochiKit.DOM.addLoadEvent = function (func) {
    /***

        This will stack load functions on top of each other.
        Each function added will be called after onload in the
        order that they were added.

    ***/
    var self = MochiKit.DOM;
    self.addToCallStack(self._window, "onload", func, true);
    
};

MochiKit.DOM.focusOnLoad = function (element) {
    var self = MochiKit.DOM;
    self.addLoadEvent(function () {
        element = self.getElement(element);
        if (element) {
            element.focus();
        }
    });
};
        

MochiKit.DOM.setElementClass = function (element, className) {
    /***

        Set the entire class attribute of an element to className.
    
    ***/
    var self = MochiKit.DOM;
    var obj = self.getElement(element);
    if (self.attributeArray.compliant) {
        obj.setAttribute("class", className);
    } else {
        obj.setAttribute("className", className);
    }
};
        
MochiKit.DOM.toggleElementClass = function (className/*, element... */) {
    /***
    
        Toggle the presence of a given className in the class attribute
        of all given elements.

    ***/
    var self = MochiKit.DOM;
    for (var i = 1; i < arguments.length; i++) {
        var obj = self.getElement(arguments[i]);
        if (!self.addElementClass(obj, className)) {
            self.removeElementClass(obj, className);
        }
    }
};

MochiKit.DOM.addElementClass = function (element, className) {
    /***

        Ensure that the given element has className set as part of its
        class attribute.  This will not disturb other class names.

    ***/
    var self = MochiKit.DOM;
    var obj = self.getElement(element);
    var cls = obj.className;
    // trivial case, no className yet
    if (cls.length == 0) {
        self.setElementClass(obj, className);
        return true;
    }
    // the other trivial case, already set as the only class
    if (cls == className) {
        return false;
    }
    var classes = obj.className.split(" ");
    for (var i = 0; i < classes.length; i++) {
        // already present
        if (classes[i] == className) {
            return false;
        }
    }
    // append class
    self.setElementClass(obj, cls + " " + className);
    return true;
};

MochiKit.DOM.removeElementClass = function (element, className) {
    /***

        Ensure that the given element does not have className set as part
        of its class attribute.  This will not disturb other class names.

    ***/
    var self = MochiKit.DOM;
    var obj = self.getElement(element);
    var cls = obj.className;
    // trivial case, no className yet
    if (cls.length == 0) {
        return false;
    }
    // other trivial case, set only to className
    if (cls == className) {
        self.setElementClass(obj, "");
        return true;
    }
    var classes = obj.className.split(" ");
    for (var i = 0; i < classes.length; i++) {
        // already present
        if (classes[i] == className) {
            // only check sane case where the class is used once
            classes.splice(i, 1);
            self.setElementClass(obj, classes.join(" "));
            return true;
        }
    }
    // not found
    return false;
};

MochiKit.DOM.swapElementClass = function (element, fromClass, toClass) {
    /***

        If fromClass is set on element, replace it with toClass.  This
        will not disturb other classes on that element.

    ***/
    var obj = MochiKit.DOM.getElement(element);
    var res = MochiKit.DOM.removeElementClass(obj, fromClass);
    if (res) {
        MochiKit.DOM.addElementClass(obj, toClass);
    }
    return res;
};

MochiKit.DOM.hasElementClass = function (element, className/*...*/) {
    /***
      
      Return true if className is found in the element

    ***/
    var obj = MochiKit.DOM.getElement(element);
    var classes = obj.className.split(" ");
    for (var i = 1; i < arguments.length; i++) {
        var good = false;
        for (var j = 0; j < classes.length; j++) {
            if (classes[j] == arguments[i]) {
                good = true;
                break;
            }
        }
        if (!good) {
            return false;
        }
    }
    return true;
};

MochiKit.DOM.escapeHTML = function (s) {
    /***

        Make a string safe for HTML, converting the usual suspects (lt,
        gt, quot, amp)

    ***/
    return s.replace(/&/g, "&amp;"
        ).replace(/"/g, "&quot;"
        ).replace(/</g, "&lt;"
        ).replace(/>/g, "&gt;");
};

MochiKit.DOM.toHTML = function (dom) {
    /***

        Convert a DOM tree to a HTML string using emitHTML

    ***/
    return MochiKit.DOM.emitHTML(dom).join("");
};

MochiKit.DOM.emitHTML = function (dom, /* optional */lst) {
    /***

        Convert a DOM tree to a list of HTML string fragments

        You probably want to use toHTML instead.

    ***/

    if (typeof(lst) == 'undefined' || lst == null) {
        lst = [];
    }
    // queue is the call stack, we're doing this non-recursively
    var queue = [dom];
    var self = MochiKit.DOM;
    var escapeHTML = self.escapeHTML;
    var attributeArray = self.attributeArray;
    while (queue.length) {
        dom = queue.pop();
        if (typeof(dom) == 'string') {
            lst.push(dom);
        } else if (dom.nodeType == 1) {
            // we're not using higher order stuff here
            // because safari has heisenbugs.. argh.
            //
            // I think it might have something to do with
            // garbage collection and function calls.
            lst.push('<' + dom.nodeName.toLowerCase());
            var attributes = [];
            var domAttr = attributeArray(dom);
            for (var i = 0; i < domAttr.length; i++) {
                var a = domAttr[i];
                attributes.push([
                    " ",
                    a.name,
                    '="',
                    escapeHTML(a.value),
                    '"'
                ]);
            }
            attributes.sort();
            for (i = 0; i < attributes.length; i++) {
                var attrs = attributes[i];
                for (var j = 0; j < attrs.length; j++) {
                    lst.push(attrs[j]);
                }
            }
            if (dom.hasChildNodes()) {
                lst.push(">");
                // queue is the FILO call stack, so we put the close tag
                // on first
                queue.push("</" + dom.nodeName.toLowerCase() + ">");
                var cnodes = dom.childNodes;
                for (i = cnodes.length - 1; i >= 0; i--) {
                    queue.push(cnodes[i]);
                }
            } else {
                lst.push('/>');
            }
        } else if (dom.nodeType == 3) {
            lst.push(escapeHTML(dom.nodeValue));
        }
    }
    return lst;
};

MochiKit.DOM.setDisplayForElement = function (display, element/*, ...*/) {
    /***

        Change the style.display for the given element(s).  Usually
        used as the partial forms:

            showElement(element, ...);
            hideElement(element, ...);

    ***/
    var m = MochiKit.Base;
    var elements = m.extend(null, arguments, 1);
    MochiKit.Iter.forEach(
        m.filter(null, m.map(MochiKit.DOM.getElement, elements)),
        function (element) {
            element.style.display = display;
        }
    );
};

MochiKit.DOM.scrapeText = function (node, /* optional */asArray) {
    /***
    
        Walk a DOM tree and scrape all of the text out of it as a string
        or an Array

    ***/
    var rval = [];
    MochiKit.Base.nodeWalk(node, function (node) {
        var nodeValue = node.nodeValue;
        if (typeof(nodeValue) == 'string') {
            rval.push(nodeValue);
        }
        return node.childNodes;
    });
    if (asArray) {
        return rval;
    } else {
        return rval.join("");
    }
};


MochiKit.DOM.__new__ = function (win) {

    var m = MochiKit.Base;
    this._document = document;
    this._window = win;

    this.domConverters = new m.AdapterRegistry(); 
    
    var __tmpElement = this._document.createElement("span");
    var attributeArray;
    if (__tmpElement.attributes.length > 0) {
        // for braindead browsers (IE) that insert extra junk
        var filter = m.filter;
        attributeArray = function (node) {
            return filter(attributeArray.ignoreAttrFilter, node.attributes);
        }
        attributeArray.ignoreAttr = {};
        MochiKit.Iter.forEach(__tmpElement.attributes, function (a) {
            attributeArray.ignoreAttr[a.name] = a.value;
        });
        attributeArray.ignoreAttrFilter = function (a) {
            return (attributeArray.ignoreAttr[a.name] != a.value);
        }
        attributeArray.compliant = false;
        attributeArray.renames = {
            "class": "className",
            "checked": "defaultChecked"
        };
    } else {
        attributeArray = function (node) {
            /***
                
                Return an array of attributes for a given node,
                filtering out attributes that don't belong for
                that are inserted by "Certain Browsers".

            ***/
            return node.attributes;
        }
        attributeArray.compliant = true;
        attributeArray.renames = {};
    }
    this.attributeArray = attributeArray;


    // shorthand for createDOM syntax
    var createDOMFunc = this.createDOMFunc;
    this.UL = createDOMFunc("ul");
    this.OL = createDOMFunc("ol");
    this.LI = createDOMFunc("li");
    this.TD = createDOMFunc("td");
    this.TR = createDOMFunc("tr");
    this.TBODY = createDOMFunc("tbody");
    this.THEAD = createDOMFunc("thead");
    this.TFOOT = createDOMFunc("tfoot");
    this.TABLE = createDOMFunc("table");
    this.TH = createDOMFunc("th");
    this.INPUT = createDOMFunc("input");
    this.SPAN = createDOMFunc("span");
    this.A = createDOMFunc("a");
    this.DIV = createDOMFunc("div");
    this.IMG = createDOMFunc("img");
    this.BUTTON = createDOMFunc("button");
    this.TT = createDOMFunc("tt");
    this.PRE = createDOMFunc("pre");
    this.H1 = createDOMFunc("h1");
    this.H2 = createDOMFunc("h2");
    this.H3 = createDOMFunc("h3");
    this.BR = createDOMFunc("br");
    this.HR = createDOMFunc("hr");
    this.LABEL = createDOMFunc("label");
    this.TEXTAREA = createDOMFunc("textarea");
    this.FORM = createDOMFunc("form");
    this.P = createDOMFunc("p");
    this.SELECT = createDOMFunc("select");
    this.OPTION = createDOMFunc("option");
    this.OPTGROUP = createDOMFunc("optgroup");
    this.LEGEND = createDOMFunc("legend");
    this.FIELDSET = createDOMFunc("fieldset");

    this.hideElement = m.partial(this.setDisplayForElement, "none");
    this.showElement = m.partial(this.setDisplayForElement, "block");
    this.removeElement = this.swapDOM;

    this.$ = this.getElement;

    this.EXPORT_TAGS = {
        ":common": this.EXPORT,
        ":all": m.concat(this.EXPORT, this.EXPORT_OK)
    };

    m.nameFunctions(this);

};

MochiKit.DOM.__new__(this);

MochiKit.Base._exportSymbols(this, MochiKit.DOM);
