var config = new Config();
var uninstallList = [];

window.addEventListener("load", function(ev) {
  config.load();
  loadControls();

  if (!config.scripts.length == 0) {
    populateChooser();
    chooseScript(0);
  }
}, false);

function handleOkButton() {
  for (var i = 0, script = null; (script = uninstallList[i]); i++) {
    var idx = config.find(script.namespace, script.name);
    config.scripts.splice(idx, 1);
  }
  config.save();

  var chkUninstallPrefs = document.getElementById('chkUninstallPrefs');
  for (var i = 0, script = null; (script = uninstallList[i]); i++) {
    file = getScriptBasedir(script);
    file.normalize();
    if (!file.equals(getScriptDir())) {
      if (file.exists()) {
        file.remove(true); // file==base directory recursive delete
      }
    } else {
      file = getScriptFile(script);
      if (file.exists()) {
        file.remove(false);
      }
    }
    if (chkUninstallPrefs.checked) {
       // Remove saved preferences
       var scriptPrefRoot = ["scriptvals.",
                  script.namespace,
                  "/",
                  script.name,
                  "."].join("");
       GM_prefRoot.remove(scriptPrefRoot);
    }
  }
  return true;
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
     if (selectedScript) {
       selectedScript.enabled = chkEnabled.checked;
       if (selectedScript.enabled) {
         listbox.selectedItem.style.color = '';
       } else {
         listbox.selectedItem.style.color = 'gray';
       }
     }
  }, false);
};

function updateDetails() {
  if (listbox.selectedCount == 0) {
    selectedScript = null;
    header.textContent = " ";
    description.textContent = " ";
    chkEnabled.checked = true;
    pagesControl.clear();
    document.documentElement.getButton("accept").disabled = false;
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
  openInEditor(getScriptFile(selectedScript),
               document.getElementById("gm-manage-bundle"));
};

function handleUninstallButton() {
  var index=listbox.selectedIndex;

  // mark script to be uninstalled on "OK"
  uninstallList.push(selectedScript);

  // remove it from the display
  listbox.removeChild(listbox.childNodes[index]);

  if (listbox.childNodes.length > 0) {
    chooseScript(Math.max(Math.min(listbox.selectedIndex, listbox.childNodes.length - 1), 0));
  }
};

function populateChooser() {
  for (var i = 0, script = null; (script = config.scripts[i]); i++) {
    var listitem = document.createElement("listitem");

    listitem.setAttribute("label", script.name);
    listitem.setAttribute("crop", "end");
    listitem.script = script;
    listitem.index = i;

    if (!script.enabled) {
      listitem.style.color = 'gray';
    }

  listbox.appendChild(listitem);
  }
};

function chooseScript(index) {
  listbox.selectedIndex = index;
  listbox.focus();
};

function toggleScript(index, enableFlag) {
  var listitem = listbox.childNodes[index];
  if (enableFlag) {
    listitem.script.enabled = true;
    listitem.style.color = '';
  } else {
    listitem.script.enabled = false;
    listitem.style.color = 'gray';
  }
};

function reorderScript(from, to) {
  // make sure to and from are in range
  if (from < 0 || to < 0 ||
    from > config.scripts.length || to > config.scripts.length
  ) {
    return false;
  }

  // REORDER CONFIG:
  // save item-to-move
  var tmp = config.scripts[from];
  // remove it
  config.scripts.splice(from, 1);
  // put it back in the new spot
  config.scripts.splice(to, 0, tmp);

  // REORDER DISPLAY:
  var tmp = listbox.childNodes[from];
  listbox.removeChild(tmp);
  listbox.insertBefore(tmp, listbox.childNodes[to]);
  // fix the listbox indexes
  for (var i=0, node=null; node=listbox.childNodes[i]; i++) {
    node.index=i;
  }

  // then re-select the dropped script
  listbox.selectedIndex = to;

  return true;
};

// allow reordering scripts with keyboard (alt- up and down)
function listboxKeypress(event) {
  if (0 == listbox.selectedCount) return;
  if (!event.altKey) return;

  var index = listbox.selectedIndex;

  if (KeyEvent.DOM_VK_UP == event.keyCode) {
    if (0 == index) return;

    !reorderScript(index, index - 1);
    listbox.selectedIndex = index - 1;
  } else if (KeyEvent.DOM_VK_DOWN == event.keyCode) {
    if (index == config.scripts.length - 1) return;

    !reorderScript(index, index + 1);
    listbox.selectedIndex = index + 1;
  }
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
    reorderScript(index, newIndex);
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