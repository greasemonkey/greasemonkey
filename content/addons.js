/*
(function() {
  // Override the existing showView() function
  var _origShowView = showView;
  showView = function(aView) {
    dump('show view '+aView+'\n');
    if ('userscripts'==aView) {
      greasemonkeyAddons.selectMe();
    } else {
      _origShowView(aView);
    }
  };
})();

var greasemonkeyAddons={
  oncommand: function() {
    greasemonkeyAddons.selectMe();
  },

  select: function(event) {
    //alert(event.target.id);
    var selected = event.explicitOriginalTarget;
    if ('viewGroup'==selected.id) {
      selected = selected.getAttribute("last-selected");
    } else {
      selected = selected.id;
    }

    if ('userscripts-view'==selected) {
      greasemonkeyAddons.selectMe();
    } else {
      $('addonsMsg').hidden = false;
      $('userscripts').hidden = true;
    }
  },

  selectMe: function() {
    function $(id) { return document.getElementById(id); }
    function hide(el) { if ('string'==typeof el) el=$(el); el.hidden=true; }

    // Hide the native controls that don't work in the user scripts "tab".
    var elementIds=[
      'searchPanel', 'installFileButton', 'checkUpdatesAllButton',
      'skipDialogButton', 'themePreviewArea', 'themeSplitter',
      'showUpdateInfoButton', 'hideUpdateInfoButton',
      'installUpdatesAllButton', 'addonsMsg'];
    elementIds.forEach(hide);

    $('viewGroup').setAttribute('last-selected', 'userscripts');
    //$('userscripts-view').selected = true;
    $('userscripts').hidden = false;
    greasemonkeyAddons.fillList();
  },

  fillList: function() {
    // I'd much prefer to use the inbuilt templates/rules mechanism that the
    // native FFX bits of this dialog use, but this works as P.O.C.
    var config = GM_getConfig();
    var listbox = document.getElementById('userscripts');

    while (listbox.firstChild) {
      listbox.removeChild(listbox.firstChild);
    }

    for (var i = 0, script = null; script = config.scripts[i]; i++) {
       var item = document.createElement('richlistitem');
       var label = document.createElement('label');
       label.setAttribute('value', script.name);
       item.appendChild(label);

       listbox.appendChild(item);
    }
  }
};

document.getElementById('viewGroup').addEventListener(
    'select', greasemonkeyAddons.select, false);
*/


(function() {
// Override the existing showView() function, to add in capabilities for our
// custom view.
var _origShowView = showView;
showView = function(aView) {
  if ('userscripts'==aView) {
    greasemonkeyAddons.showView();
  } else {
    _origShowView(aView);
  }
};
})();

var greasemonkeyAddons={
  showView: function(aView) {
    updateLastSelected('userscripts');
    gView='userscripts';

    function $(id) { return document.getElementById(id); }
    function hide(el) { if ('string'==typeof el) el=$(el); el.hidden=true; }

    // Hide the native controls that don't work in the user scripts view.
    var elementIds=[
      'searchPanel', 'installFileButton', 'checkUpdatesAllButton',
      'skipDialogButton', 'themePreviewArea', 'themeSplitter',
      'showUpdateInfoButton', 'hideUpdateInfoButton',
      'installUpdatesAllButton'];
    elementIds.forEach(hide);

    //AddonsViewBuilder.updateView([]);
    greasemonkeyAddons.fillList();
  },

  fillList: function() {
    // I'd much prefer to use the inbuilt templates/rules mechanism that the
    // native FFX bits of this dialog use, but this works as P.O.C.
    var config = GM_getConfig();
    var listbox = gExtensionsView;

    while (listbox.firstChild) {
      listbox.removeChild(listbox.firstChild);
    }

    for (var i = 0, script = null; script = config.scripts[i]; i++) {
       var item = document.createElement('richlistitem');
       var label = document.createElement('label');
       label.setAttribute('value', script.name);
       item.appendChild(label);

       listbox.appendChild(item);
    }
  }
};
