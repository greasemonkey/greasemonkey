'use strict';
/*
This file is responsible for tracking and exposing the global "enabled" state
of Greasemonkey.
*/


window.options_ready = false;

// Private implementation.

window.initrc.startAdd(async function() {


let opt_val = {};

const opt_default = {
   'globalEnable':true,
   'globalExcludes':[],
   'simpleEditorSpellCheck':false,
   'codeEditor':'simple',
   'codeMirrorScreenReaderLabel':false,
   'codeMirrorTheme':'default',
   'codeMirrorKeyMap':'default',
   'codeMirrorInputStyle':'textarea',
   'codeMirrorLineNumber':true,
   'codeMirrorAutoCorrect':true,
   'codeMirrorAutoCapitalize':false,
   'codeMirrorSpellCheck':false,
   'codeMirrorLineWrapping':false,
   'codeMirrorTabSize':2
};

const opt_list = {
   'globalEnable':'globalEnable',
   'globalExcludes':'excludes',
   'simpleEditorSpellCheck':'simpleEditorSpellCheck',
   'codeEditor'     : 'codeEditor',
   'codeMirrorTheme':'codeMirrorTheme',
   'codeMirrorKeyMap':'codeMirrorKeyMap',
   'codeMirrorInputStyle' : 'codeMirrorInputStyle',
   'codeMirrorLineNumber':'codeMirrorLineNumber',
   'codeMirrorScreenReaderLabel':'codeMirrorScreenReaderLabel',
   'codeMirrorAutoCorrect':'codeMirrorAutoCorrect',
   'codeMirrorAutoCapitalize':'codeMirrorAutoCapitalize',
   'codeMirrorSpellCheck':'codeMirrorSpellCheck',
   'codeMirrorLineWrapping':'codeMirrorLineWrapping',
   'codeMirrorTabSize':'codeMirrorTabSize'
};

const opt_in = {
    'globalExcludes': function(v){
        if(Array.isArray(v))
           return v.join('/n');
        return '';
    }
};

const opt_out = {
    'globalExcludes': function(v){
        return v.split('/n');
    }
};

const optionOut = function (key_, val_){
    if (typeof opt_out[key_] === 'undefined')
        return val_;
    return opt_out[key_](val_);
};

const optionIn = function (key_, val_){
    if (typeof opt_out[key_] === 'undefined')
        return val_;
    return opt_in[key_](val_);
};

/**
 * A simplified storage layer for asynchronous operations,
 * while regarding to the DRY principle.
 *
 * @param {string}
 * @param {any}
 * @async
**/
const chromeGet = async function (key_, default_){
  return await (new Promise((resolve)=>{
    chrome.storage.local.get(key_, (v)=> {
      if (
        (typeof v === 'undefined') ||
        (typeof v[key_] === 'undefined')
      )
        resolve(default_);
      resolve(
        optionOut(key_, v[key_])
      );
    });
  }));
};

const chromeGets = async function (){
    const out = {}; 
    for (let i in opt_list)
        out[i] = await chromeGet(i, opt_default[i]);
    return out;
};

const chromeSets = async function (set_){
  const new_val = {}
  for (let i in opt_list){
      if (typeof set_[opt_list[i]] === 'undefined'){
          new_val[i] = optionIn(i, opt_val[i]);
      }else{
          new_val[i] = optionIn(i, set_[opt_list[i]]);
      }
      opt_val[i] = optionOut(i, new_val[i]);
  }
  chrome.storage.local.set(
      new_val,
      logUnhandledError
  );
};


opt_val = await chromeGets();

function getGlobalEnabled() {
  return !!opt_val.globalEnable;
}
window.getGlobalEnabled = getGlobalEnabled;


function getGlobalExcludes() {
  return opt_val.globalExcludes.slice();
}
window.getGlobalExcludes = getGlobalExcludes;


function onEnabledQuery(message, sender, sendResponse) {
  sendResponse(opt_val.globalEnable);
}
window.onEnabledQuery = onEnabledQuery;


function setGlobalEnabled(enabled) {
  opt_val.globalEnable = !!enabled;
  chrome.runtime.sendMessage({
    'name': 'EnabledChanged',
    'enabled': opt_val.globalEnable,
  }, logUnhandledError);
  setIcon();
  chrome.storage.local.set({'globalEnabled': enabled});
}
window.setGlobalEnabled = setGlobalEnabled;
function onEnabledSet(message, sender, sendResponse) {
  setGlobalEnabled(message.enabled);
  sendResponse();
}
window.onEnabledSet = onEnabledSet;


function setIcon() {
  // Firefox for Android does not have setIcon
  // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/browserAction/setIcon#Browser_compatibility
  if (!chrome.browserAction.setIcon) {
    return;
  }
  let iconPath = chrome.extension.getURL('skin/icon.svg');
  if (opt_val.globalEnable) {
    chrome.browserAction.setIcon({'path': iconPath});
  } else {
    let img = document.createElement('img');
    img.onload = function() {
      let canvas = document.createElement('canvas');
      let ctx = canvas.getContext('2d');
      ctx.globalAlpha = 0.5;
      ctx.drawImage(img, 0, 0);
      chrome.browserAction.setIcon({
        'imageData': ctx.getImageData(0, 0, img.width, img.height),
      });
    };
    img.src = iconPath;
  }
}


function toggleGlobalEnabled() {
  setGlobalEnabled(!opt_val.globalEnable);
}
window.toggleGlobalEnabled = toggleGlobalEnabled;

/*****************************************************************************/

function onEnabledToggle(message, sender, sendResponse) {
  toggleGlobalEnabled();
  sendResponse(opt_val.globalEnable);
}
window.onEnabledToggle = onEnabledToggle;


function onOptionsLoad(message, sender, sendResponse) {
  const options = {};
  for (let i in opt_val)
      options[opt_list[i]] = optionIn( i, opt_val[i]);
  sendResponse(options);
}
window.onOptionsLoad = onOptionsLoad;


function onOptionsSave(message, sender, sendResponse) {
  chromeSets(message);
  sendResponse();
}
window.onOptionsSave = onOptionsSave;

window.options_ready = true;
}, 2);
