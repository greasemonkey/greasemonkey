window.onload=async function(){

    const options = await browser.runtime.sendMessage({'name': 'OptionsLoad'});
    /**
     * @type {HellForm}
    **/
    const hellForm = new HellForm();

    /**
     *
     * @param {string}
     * @return {function}
    **/
    const sendMessage = function(id_){
         const id = id_;
         /**
          *
          * @param {Object.}
          * @return {void}
         **/
         return (e)=>{
             const msg = {
               'name' : 'OptionsSave'
             };
             if(typeof e.target.checked !== 'undefined'){
                msg[id] =  e.target.checked;
             } else
                msg[id] =  e.target.value;
             chrome.runtime.sendMessage(
               msg,
               logUnhandledError
             );
         };
     };

    /**
     *
     * @param {string}
     * @param {string}
     * @param {Object.<string, string>}
    **/
    const addSelect = function(
      label_,
      id_,
      list_
    ){
        hellForm.addSelect(
          _(label_),
          id_,
          list_,
          sendMessage(id_)
        );
        hellForm.set(
          id_,
          options[id_]
        );
    };

    /**
     *
     * @param {string}
     * @param {string}
    **/
    const addCheckbox = function(
      label_,
      id_
    ){
        hellForm.addCheckbox(
          _(label_),
          id_,
          sendMessage(id_)
        );
        hellForm.set(
          id_,
          options[id_]
        );
    };
    addCheckbox(
      'Simple editor spell check',
      'simpleEditorSpellCheck'
    );
    addSelect(
      'code editor',
      'codeEditor',
      {
        'simple' : 'Simple Editor',
        'cm5' : 'Code Mirror 5',
      }
    );
    addSelect(
      'CodeMirror Key Map',
      'codeMirrorKeyMap',
      {
        'default' : 'Default',
        'sublime' : 'Sublime',
        'emacs' : 'Emacs',
        'vim' : 'Vim',
      }
    );
    addSelect(
      'CodeMirror Theme',
      'codeMirrorTheme',
      {
        'default':'Default',
        'material-darker':'Material Darker',
      }
    );
    addSelect(
        'Code Mirror tab size',
        'codeMirrorTabSize',
        {
            '2':'2',
            '4':'4',
        }
    );
    addSelect(
        'Code Mirror input style',
        'codeMirrorInputStyle',
        {
            'textarea' : 'textarea',
            'contenteditable' : 'contenteditable'
        }
    );
    addCheckbox(
      'CodeMirror Line Number',
      'codeMirrorLineNumber'
    );
    addCheckbox(
      'CodeMirror Line Wrapping',
      'codeMirrorLineWrapping'
    );
    addCheckbox(
      'CodeMirror ScreenReader Label',
      'codeMirrorScreenReaderLabel'
    );
    addCheckbox(
      'CodeMirror Spell Check',
      'codeMirrorSpellCheck'
    );
    addCheckbox(
      'CodeMirror auto correct',
      'codeMirrorAutoCorrect'
    );
    addCheckbox(
      'CodeMirror auto capitalize',
      'codeMirrorAutoCapitalize'
    );
    document.getElementsByTagName('body')[0].appendChild(
      hellForm.render()
    );
};
