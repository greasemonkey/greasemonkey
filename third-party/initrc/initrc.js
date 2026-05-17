/*
 *  @Soldy\initrc\2021.02.21\GPL3
 */
'use strict';
/*
 * @param {function} before_in_
 * @param {function} after_in_
 * @param {integer}  level_in_
 * @param {function} func
 * @prototype
 */
const LevelRunner = function(before_in_, after_in_, level_in_){
    /*
     * @param {function} func
     * @param {integer} level
     * @param {string} name
     * @public
     * @return {void}
     */
    this.add = function(fun, level, name){
        _add(fun, level, name);
    };
    /*
     * @public
     */
    this.run = async function(){
        await _run();
    };
    /*
     * @private
     * @var {boolean}
     */
    let _before = ()=>{};
    /*
     * @private
     * @var {boolean}
     */
    let _after = ()=>{};
    /*
     * @private
     * @var {array}
     */
    let _procedures = [];
    /*
     * @private
     * @var {array}
     */
    let _names = [];
    /*
     * @private
     * @var {integer}
     */
    let _level = 10;
    /*
     * @param {function} func
     * @param {integer} level
     * @param {string} name
     * @private
     * @return {void}
     */
    const _add = function(fun, level, name){
        let runner = {};
        if ( typeof fun !== 'function' )
            throw new TypeError (
                '"fun" is a "'+
                (typeof fun)+
                '" not a function.'
            );
        if ( typeof level !== 'number' )
            throw new TypeError (
                '"level" is a "'+
                (typeof level)+
                '" not a number.'
            );
        if ( Number.isInteger(level) === false )
            throw new TypeError (
                '"level" is not an integer.'
            );
        if ( 0 > level )
            throw new TypeError (
                '"level" is smaller than 0'
            );
        if ( level >= _level )
            throw new TypeError (
                '"level" is bigger than the max level'
            );
        runner.fun = fun;
        if(typeof name !== 'undefined'){
            if(typeof name !== 'string')
                throw new TypeError (
                    'name is a '+
                    (typeof name).toString()+
                    ' not a string'
                );
            if(_names.indexOf(name) > -1)
                throw new Error (
                    'process "'+
                    name+
                    '" is already added.'
                );
            _names.push(name.toString());
            runner.name = name;
        }
        _procedures[level].push(runner);
    };
    /*
     * @private
     */
    const _run=async function(){
        _before();
        for (let p of _procedures) 
            for (let i of p) 
                await _execute(i);
        _after();
    };
    /*
     * @param {object} procedure
     * @private
     */
    const _execute = async function(procedure){
        if ( procedure.fun.constructor.name === 'AsyncFunction' )
            return await procedure.fun();
        return procedure.fun();
    };
    // init
    if ( typeof level_in_ !== 'number' )
        throw new TypeError (
            'level number is "'+
            level_in_+
            '" that not a number.'
        );
    if (!Number.isInteger(level_in_) )
        throw new TypeError (
            'level number is "'+
            level_in_+
            '" that not an integer.'
        );
    if ( 1 > level_in_ )
        throw new TypeError (
            'level number is "'+
            level_in_+
            '" that smaller than 1.'
        );
    if (  level_in_ > 100 )
        throw new TypeError (
            'level number is too high"'
        );
    _level = parseInt(level_in_);
    for(let i =0; _level> i; i++)
        _procedures.push([]);
    if ( typeof after_in_ !== 'function' )
        throw new TypeError (
            'after is not a function'
        );
    if( typeof before_in_ !== 'function' )
        throw new TypeError (
            'before is not a function'
        );
    _before = before_in_;
    _after = after_in_;
};


/*
 * @prototype
 */
const Init=function(){
    /*
     * @param {function} func
     * @param {integer} level
     * @param {string} name
     * @public
     * @return {boolean}
     */
    this.startAdd = function(fun, level, name){
        return _start.add(fun, level, name);
    };
    /*
     * @public
     */
    this.startRun = async function(){
        return await _start.run();
    };
    /*
     * @param {function} func
     * @param {integer} level
     * @param {string} name
     * @public
     * @return {boolean}
     */
    this.stopAdd = function(fun, level, name){
        return _stop.add(fun, level, name);
    };
    /*
     * @public
     */
    this.stopRun = async function(){
        return await _stop.run();
    };
    /*
     * @public
     * @return {integer}
     */
    this.status = function(){
        return parseInt(_status);
    };
    /*
     * init status 
     * 0 = init
     * 1 = boot
     * 2 = main
     * 3 = shotdown 
     *
     * @private
     * @var {integer} 
     */
    let _status = 0;
    /*
     * @private
     */
    const _start = new LevelRunner(
        function(){
            _status = 1;
        },
        function(){
            _status = 2;
        },
        10
    );
    /*
     * @orivate
     */
    const _stop = new LevelRunner(
        function(){
            _status = 3;
        },
        function(){
            _status = 4;
        },
        10
    );
    /*
     * @public
     */
    this.start = _start;
    /*
     * @public
     */
    this.stop = _stop;
};

window.initrc = new Init();
