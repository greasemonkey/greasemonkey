/**
 * Fast like hell. form generator.
 *
 * @version 0.1.2
 *
 */

'use strict';


/**
 * This is a single-class tool. Implementation is easy :
 * const form = new HellForm();
 *
 * @class
 */
const HellForm = function(){
    /**
     * Class name resolver.
     * Return with the inside used class name.
     *
     * @param {string} name
     * @public
     * @returns {string}
     */
    this.class = function(name_){
        return _class(name_);
    };

    /**
     * Id string resolver.
     * Return with the id string
     * that is used inside.
     *
     * @param {string} name_
     * @public
     * @returns {void}
     */
    this.id = function(name_){
        return _id(name_);
    };

    /**
     *
     * @param {string} label_
     * @param {string} name_
     * @param {function} func_
     * @public
     * @returns {void}
     */
    this.addPass = function(label_, name_, func_){
        return _add(1,  label_, name_, func_);
    };

    /**
     *
     * @param {string} label_
     * @param {string} name_
     * @param {function} func_
     * @public
     * @returns {void}
     */
    this.addText = function(label_, name_, func_){
        return _add(0, label_, name_, func_);
    };

    /**
     *
     * @param {string} label_
     * @param {string} name_
     * @param {function} func_
     * @public
     * @returns {void}
     */
    this.addArea = function(label_, name_, func_){
        return _add(3, label_, name_, func_);
    };

    /**
     *
     * @param {string} label_
     * @param {string} name_
     * @param {object} list_
     * @param {function} func_
     * @public
     * @returns {void}
     */
    this.addSelect = function(label_, name_, list_, func_){
        return _add(2, label_, name_, func_, list_);
    };

    /**
     *
     * @param {string} label_
     * @param {string} name_
     * @param {function} func_
     * @public
     * @returns {void}
     */
    this.addCheckbox = function(label_, name_, func_){
        return _add(4, label_, name_, func_);
    };

    /**
     * This is set or add the main form title.
     * Useful if we use multiple forms on the same page.
     *
     * @param {string} title
     * @param {string} clas
     * @public
     * @returns {void}
     */
    this.addTitle = function(title_, clas_){
        return _addTitle(title_, clas_);
    };

    /**
     * Main notice set
     *
     * @param {string} notice message_
     * @param {string} clas_
     * @public
     * @returns {void}
     */
    this.addNotice = function(notice_, clas_){
        return _addNotice(notice_, clas_);
    };

    /**
     * Every form has only one submit button possibility.
     * However, the auto-submit is easy to do.
     * So I see no reason to change that.
     *
     * @param {string} name_
     * @param {string} id_
     * @param {function} func_
     * @public
     * @returns {void}
     */
    this.addSubmit = function(name_, id_, func_){
        return _addSubmit(name_, id_, func_);
    };

    /**
     *
     * @param {string} name_
     * @param {array} list_
     * @public
     */
    this.updateSelect = function(name_, list_){
        _selectUpdate(name_, list_);
    };

    /**
     * The render function triggers the
     * form render process, and come back with
     * the DOM element.
     * The original version had the retard object
     * support.
     * However, that was removed. Currently, this is
     * always returned with the DOMElement.
     *
     * @public
     * @returns {DOMElement}
     */
    this.render = function(){
        return _render();
    };

    /**
     * Come back with the input field element.
     *
     * @param {string} id_
     * @public
     * @returns {DOMelement|null}
     */
    this.get = function(id_){
        return _get(id_);
    };

    /**
     * set value.
     *
     * @param {string} element basic id
     * @param {string} value
     * @public
     * @returns {void}
     */
    this.set = function(id_, value_){
        return _set(id_, value_);
    };

    /**
     * Come back with the input field value.
     *
     * @param {string} element basic id
     * @public
     * @return {string}
     */
    this.value = function(id){
        return _value(id);
    };

    /**
     *
     * @public
     * @return {Object<string, string>}
     */
    this.json = function(){
        const out = {};
        for(let i of _ids)
            out[i] = _value(i);
        return out;
    };

    /**
     *
     * @type {Object.<string, string>}
     * @private
     */
    let _values = {};

    /**
     *
     * @type {Object.<string, string>}
     * @private
     */
    let _title = {};

    /**
     *
     * @type {object}
     * @private
     */
    let _notice = {};

    /**
     *
     * @type {object}
     * @private
     */
    let _notice_element = {};

    /**
     *
     * @type {array}
     * @private
     */
    let _forms = [];

    /**
     *
     * @type {object}
     * @private
     */
    let _submit;

    /**
     *
     * @type {array<string>}
     * @private
     */
    let _ids = [];

    /**
     *
     * @type {object}
     * @private
     */
    let _element;
    /**
     *
     * @type {object}
     * @private
     */
    let _lines = {};

    /**
     *
     * @type {object}
     * @private
     */
    let _labels = {};

    /**
     *
     * @type {object}
     * @private
     */
    let _fields = {};

    /**
     *
     * @type {object}
     * @private
     */
    let _submit_line;

    /**
     *
     * @type {boolean}
     * @private
     */
    let _rendered = false;

    /**
     *
     * @param {string} id_
     * @private
     */
    const _elementExistCheck = function(id_){
        if(typeof _fields[id_] === 'undefined')
            throw Error(id_+' not exist');
    };

    /**
     *
     * @param {string} id_
     * @private
     * @returns {string}
     */
    const _get = function(id_){
        return _fields[id_];
    };

    /**
     *
     * @param {string} id_
     * @private
     * @returns {string}
     */
    const _value = function(id_){
        return _get(id_).value;
    };

    /**
     *
     * @param {string} name_
     * @private
     * @returns {string}
     */
    const _id = (name_)=>{
        return ('hellform_id_'+name_);
    };

    /**
     *
     * @param {string} name_
     * @private
     * @returns {string}
     */
    const _class = (name_)=>{
        return ('hellform_'+name_);
    };

    /**
     *
     * @param  {...string} c_
     * @private
     * @returns {string}
     */
    const _attreses = (...c_)=>{
        let out = '';
        let s = 0;
        for(let i of c_){
            if(s>0) out+=' ';
            out+=i;
            s++;
        }
        return out;
    };

    /**
     *
     * @param {string} tag_
     * @private
     * @returns {object}
     */
    const _create = function(tag_){
        return document.createElement(tag_);
    };

    /**
     *
     * @param {string} type_
     * @param {string} label_
     * @param {string} name_
     * @param {function} func_
     * @param {array} list_
     * @private
     * @returns {void}
     */
    const _add = function(type_, label_, name_, func_, list_){
        let form = {
            type:type_,
            label:label_,
            name:name_,
            func:func_
        };
        if(type_ === 2){
            form.list = {};
            for(let i in list_)
                form.list[i.toString()] = list_[i].toString();
        }
        _ids.push(name);
        _forms.push(form);
    };

    /**
     *
     * @param {string} title
     * @param {string} clas
     * @private
     * @returns {void}
     */
    const _addTitle = function(title, clas){
        if (typeof clas === 'undefined')
            clas = '';
        _title = {
            'name':title.toString(),
            'clas':clas.toString()
        };
    };

    /**
     *
     * @param {string} title
     * @param {string} clas
     * @private
     * @returns {void}
     */
    const _addNotice = function(title, clas){
        if (typeof clas === 'undefined')
            clas = '';
        _notice = {
            'name':notice.toString(),
            'clas':clas.toString()
        };
    };

    /**
     *
     * @param {string} title_
     * @param {string} id_
     * @param {function} func_
     * @private
     * @returns {void}
     */
    const _addSubmit = function(title_, id_, func_){
        _submit.innerHTML = '';
        const input = _input(
          'submit',
          id_.toString(),
          func_,
          title_.toString()
        );
        input.value = title_;
        _submit.className = _class('submit_holder');
        _submit.appendChild(input);
    };

    /**
     *
     * @param  {...any} inner
     * @private
     * @returns {object}
     */
    const _lineRender = function(...inner){
        const line =  _create('div');
        line.className = _class('line');
        for(let i of inner){
            line.appendChild(i);
        }
        return line;
    };

    /**
     *
     * @param {string} label
     * @param {object} inner
     * @private
     * @returns {object}
     */
    const _lineFormRender = function(name, label, inner){
        return _lineRender(
            _labelRender(name, label),
            inner
        );
    };

    /**
     *
     * @param {string} type
     * @param {string} name
     * @param {function} func
     * @param {string} label
     * @private
     * @returns {object}
     */
    const _input = function(type_, name_, func_, label_){
        const input = _create('input');
        _inputAttribute(input, type_, name_, func_);
        if(typeof label_ !== 'undefined')
            input.setAttribute('placeholder', label_);
        _fields[name_] = input;
        return input;
    };

    /**
     *
     * @param {string} input_
     * @param {string} type_
     * @param {string} name_
     * @param {function} func
     * @private
     */
    const _inputAttribute = function(input_, type_, name_, func_){
        input_.className = _class(type_);
        input_.setAttribute('type', type_);
        input_.setAttribute('id', _id(name_));
        input_.setAttribute('name', name_);
        if(type_ === 'submit') {
            input_.addEventListener('click', func_);
        } else if(type_ === 'select') {
            input_.addEventListener('change', func_);
        } else if(type_ === 'checkbox') {
            input_.addEventListener('change', func_);
        } else
            input_.addEventListener('keyup', func_);
    };

    /**
     *
     * @param {string} label_
     * @private
     * @returns {DOMElement}
     */
    const _labelRender = function(name_, label_){
        const elem = _create('div');
        elem.className = _class('label');
        elem.textContent = label_;
        _labels[name_] = elem;
        return elem;
    };

    /**
     *
     * @private
     * @returns {DOMElement}
     */
    const _titleRender = function(){
        const title =  _create('div');
        title.className = _attreses(
          _class('title'),
          _title.clas
        );
        title.textContent = _title.name;
        return _lineRender(title);
    };

    /**
     *
     * @private
     */
    const _noticeInit = function(){
        _notice_element = _create('div');
    };

    /**
     *
     * @private
     * @returns {DOMElement}
     */
    const _noticeRender = function(){
        _notice_element.className = _attreses(
          _class('notice'),
          _notice.clas
        );
        _notice_element.textContent = _notice.name;
        return _lineRender(_notice_element);
    };

    /**
     *
     * @private
     * @returns {DOMElement}
     */
    const _submitRender = function(){
        return _lineRender(_submit);
    };

    /**
     *
     * @param {string} label_
     * @param {string} name_
     * @param {function} func_
     * @private
     * @returns {DOMElement}
     */
    const _passRender = function(label, name_, func_){
        const input = _input('password', name_, func_, label);
        return _lineFormRender(
          name,
          label,
          input
        );
    };

    /**
     *
     * @param {string} label_
     * @param {string} name_
     * @param {function} func_
     * @private
     * @returns {DOMElement}
     */
    const _checkboxRender = function(label_, name_, func_){
        const input = _input('checkbox', name_, func_);
        return _lineFormRender(
          name_,
          label_,
          input
        );
    };

    /**
     *
     * @param {string} label_
     * @param {string} name_
     * @param {function} func_
     * @private
     * @returns {DOMElement}
     */
    const _textRender = function(label_, name_, func_){
        const input = _input('text', name_, func_, label_);
        return _lineFormRender(
            name_,
            label_,
            input
        );
    };

    /**
     *
     * @param {string} label_
     * @param {string} name_
     * @param {function} func_
     * @private
     * @returns {DOMElement}
     */
    const _areaRender = function(label_, name_, func_){
        const area = _create('textarea');
        _inputAttribute(area, 'textarea', name_, func_);
        return _lineFormRender(
            name_,
            label_,
            area
        );
    };

    /**
     *
     * @param {DOMElement} select_
     * @param {array} list_
     * @private
     */
    const _optionRender = function(select_, list_){
        for(let i in list_){
            let option = _create('option');
            option.setAttribute('value', i.toString());
            option.textContent = list_[i].toString();
            select_.appendChild(option);
        }
    };

    /**
     *
     * @param {string} label_
     * @param {string} name_
     * @param {array} list_
     * @param {function} func_
     * @private
     * @returns {DOMElement}
     */
    const _selectRender = function(label_, name_, list_, func_){
        const select = _create('select');
        _inputAttribute(select, 'select', name_, func_);
        _optionRender(select, list_);
        _fields[name_] = select;
        return _lineFormRender(
            name_,
            label_,
            select
        );
    };

    /**
     *
     * @param {string} id_
     * @param {array} list_
     * @private
     */
    const _selectUpdate = function(id_, list_){
        _elementExistCheck(id_);
        const element = _fields[id_];
        const val = element.value.toString();
        while (element.firstChild)
            element.removeChild(element.firstChild);
        _optionRender(element, list_);
        element.value = val.toString();
    };

    /**
     *
     * @param {string} name_
     * @param {string} value_
     * @private
     */
    const _set = function(id_, value_){
        if (typeof value_ === 'undefined')
          return;
        if (typeof value_ === 'boolean'){
          _values[id_] = !!value_;
        } else {
          _values[id_] = value_.toString();
        }
        if(_rendered === false)
            return;
        _elementExistCheck(id_);
        _fields[id_].value = value_;
    };

    /**
     *
     * @type {array<function>}
     * @private
     */
    const _renderTypes = [
        _textRender,
        _passRender,
        _selectRender,
        _areaRender,
        _checkboxRender
    ];

    /**
     *
     * @private
     * @returns {DOMElement}
     */
    const _render = function(){
        if(_rendered === true)
            return _element;
        _element = _create('div');
        _element.appendChild(_titleRender());
        _element.appendChild(_noticeRender());
        _element.className = _class('holder');
        for(let i of _forms){
            if(i.type === 2){
                _lines[i.name] = _renderTypes[i.type](
                  i.label,
                  i.name,
                  i.list,
                  i.func
                );
            }else if ( _renderTypes.length >= i.type){
                _lines[i.name] = _renderTypes[i.type](
                  i.label,
                  i.name,
                  i.func
                );
            }
            _element.appendChild(
              _lines[i.name]
            );
            if (typeof _values[i.name] !== 'undefined'){
              if (i.type === 4){
                _fields[i.name].checked = _values[i.name];
              }else
                _fields[i.name].value = _values[i.name];
            }
        }
        _element.appendChild(_submitRender());
        _rendered = true;
        return _element;
    };

    _noticeInit();
    _submit = _create('div');
};
