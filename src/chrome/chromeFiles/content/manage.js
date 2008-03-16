var config = GM_getConfig();

window.addEventListener("load", function(ev) {
  loadControls();

  if (!config.scripts.length == 0) {
    populateChooser();
    chooseScript(0);
  }

  config.addObserver(observer);
}, false);

window.addEventListener("unload", function(ev) {
  pagesControl.clear();
  config.removeObserver(observer);
}, false);

var observer = {
  notifyEvent: function(script, event, data) {
    var node = null;
    for (var i = 0; node = listbox.childNodes[i]; i++)
      if (node.script == script)
        break;

    switch (event) {
    case "edit-enabled":
      node.style.color = data ? "" : "gray";
      if (script == selectedScript)
        chkEnabled.checked = data;
      break;
    case "install":
      addListitem(script, -1);
      break;
    case "uninstall":
      var selected = listbox.selectedItem == node;
      listbox.removeChild(node);

      if (selected && listbox.childNodes.length > 0) {
        chooseScript(Math.max(Math.min(listbox.selectedIndex, listbox.childNodes.length - 1), 0));
      }
      break;
    case "move":
      listbox.removeChild(node);
      listbox.insertBefore(node, listbox.childNodes[data]);
      // then re-select the dropped script
      listbox.selectedIndex = data;
      break;
    }

    // fix the listbox indexes
    for (var i = 0, n = null; n = listbox.childNodes[i]; i++) n.index=i;
  }
};

var listbox, header, description, chkEnabled, btnEdit, btnUninstall;
var selectedScript;
var pagesControl;

function loadControls() {
  listbox = document.getElementById("lstScripts");
  header = document.getElementById("ctlHeader");
  description = document.getElementById("ctlDescription");
  btnEdit = document.getElementById("btnEdit");
  btnUninstall = document.getElementById("btnUninstall");
  pagesControl = new PagesControl(document.getElementById("pages-control"));
  chkEnabled = document.getElementById("chkEnabled");

  listbox.addEventListener("select", function() { updateDetails(); }, false);
  btnEdit.addEventListener("command", function() { handleEditButton(); }, false);
  btnUninstall.addEventListener("command", function() { handleUninstallButton(); }, false);
  chkEnabled.addEventListener("command", function() {
     if (selectedScript)
       selectedScript.enabled = chkEnabled.checked;
  }, false);
};

function updateDetails() {
  if (listbox.selectedCount == 0) {
    selectedScript = null;
    header.textContent = " ";
    description.textContent = " ";
    chkEnabled.checked = true;
    pagesControl.clear();
  } else {
    selectedScript = listbox.getSelectedItem(0).script;

    // make sure one word isn't too long to fit ... a too-long word
    // will bump the interface out wider than the window
    var wordLen = 50;
    var desc = selectedScript.description.split(/\s+/);
    for (var i = 0; i < desc.length; i++) {
      if (desc[i].length > wordLen) {
        for (var j = desc[i].length; j > 0; j -= wordLen) {
          desc[i] = desc[i].substr(0,j) + '\u200B' + desc[i].substr(j);
        }
      }
    }
    desc = desc.join(' ');

    header.textContent = selectedScript.name;
    description.textContent = desc;
    chkEnabled.checked = selectedScript.enabled;
    pagesControl.populate(selectedScript);
  }
};

function handleEditButton() {
  openInEditor(selectedScript);
};

function handleUninstallButton() {
  var uninstallPrefs = document.getElementById("chkUninstallPrefs").checked;
  config.uninstall(selectedScript, uninstallPrefs);
};

function populateChooser() {
  var scripts = config.scripts;
  for (var i = 0, script = null; (script = scripts[i]); i++)
    addListitem(script, i);
};

function addListitem(script, i) {
  var listitem = document.createElement("listitem");

  listitem.setAttribute("label", script.name);
  listitem.setAttribute("crop", "end");
  listitem.script = script;
  listitem.index = i;

  if (!script.enabled) {
    listitem.style.color = "gray";
  }

  listbox.appendChild(listitem);
};

function chooseScript(index) {
  listbox.selectedIndex = index;
  listbox.focus();
};

// allow reordering scripts with keyboard (alt- up and down)
function listboxKeypress(event) {
  if (0 == listbox.selectedCount) return;
  if (!event.altKey) return;

  var index = listbox.selectedIndex;

  var move = null;
  if (KeyEvent.DOM_VK_UP == event.keyCode)
    move = config.move(listbox.selectedItem.script, -1);
  else if (KeyEvent.DOM_VK_DOWN == event.keyCode)
    move = config.move(listbox.selectedItem.script, 1);
};

// allow reordering scripts with drag-and-drop
var dndObserver = {
  lastFeedbackIndex: null,

  getSupportedFlavours: function () {
    var flavours = new FlavourSet();
    flavours.appendFlavour("text/unicode");
    return flavours;
  },

  onDragStart: function (event, transferData, action) {
    if ('listitem' != event.target.tagName ) return false;

    transferData.data = new TransferData();
    transferData.data.addDataForFlavour("text/unicode", event.target.index);

    return true;
  },

  onDragOver: function (event, flavour, session) {
    if (listbox.selectedIndex == event.target.index) {
      this.clearFeedback();
      return false;
    }

    return this.setFeedback(event);
  },

  onDrop: function (event, dropdata, session) {
    // clean up the feedback
    this.lastFeedbackIndex = null;
    this.clearFeedback();

    // figure out how to move
    var newIndex = this.findNewIndex(event);
    if (null === newIndex) return;
    var index = parseInt(dropdata.data);
    if (newIndex > index) newIndex--;

    // do the move
    var move = config.move(config.scripts[index], config.scripts[newIndex]);
  },

  //////////////////////////////////////////////////////////////////////////////

  setFeedback: function(event) {
    var newIndex = this.findNewIndex(event);

    // don't do anything if we haven't changed
    if (newIndex === this.lastFeedbackIndex) return false; // NOTE: possible incongruent logic
    this.lastFeedbackIndex = newIndex;

    // clear any previous feedback
    this.clearFeedback();

    // and set the current feedback
    if (null === newIndex) {
      return false;
    } else if (listbox.selectedIndex == newIndex) {
      return false;
    } else {
      if (0 == newIndex) {
        listbox.firstChild.setAttribute('dragover', 'top');
      } else if (newIndex >= listbox.childNodes.length) {
        listbox.lastChild.setAttribute('dragover', 'bottom');
      } else {
        listbox.childNodes[newIndex - 1].setAttribute('dragover', 'bottom');
      }
    }

    return true;
  },

  clearFeedback: function() {
    var box = document.getElementById('lstScripts');
    for (var i = 0, el; el = box.childNodes[i]; i++) {
      el.removeAttribute('dragover');
    }
  },

  findNewIndex: function(event) {
    var target = event.target;

    // not in the list box? forget it!
    if (listbox != target && listbox != target.parentNode) return null;

    var targetBox = target.boxObject
      .QueryInterface(Components.interfaces.nsIBoxObject);

    if (listbox == target) {
      // here, we are hovering over the listbox, not a particular listitem
      // check if we are very near the top (y + 4), return zero, else return end
      if (event.clientY < targetBox.y + 4) {
        return 0;
      } else {
        return listbox.childNodes.length;
      }
    } else {
      var targetMid = targetBox.y + (targetBox.height / 2);

      if (event.clientY >= targetMid) {
        return target.index + 1;
      } else {
        return target.index;
      }
    }

    // should never get here, but in case
    return null;
  }
};
