function ManageUI(win) {
  this.win = win;
  this.doc = win.document;
  this.config = new Config(getScriptFile("config.xml"));
  this.uninstallList = [];
  this.selectedScript = null;

  bindMethods(this);

  this.win.addEventListener("load", this.handleLoad, false);
}

ManageUI.prototype.handleLoad = function(e) {
  this.config.load();
  this.loadControls();
  
  if (!this.config.scripts.length == 0) {
    this.populateChooser();
    this.chooseScript(0);
  }
}

ManageUI.prototype.loadControls = function() {
  this.dialog = this.doc.documentElement;
  this.listbox = this.doc.getElementById("lstScripts");
  this.header = this.doc.getElementById("ctlHeader");
  this.description = this.doc.getElementById("ctlDescription");
  this.btnEdit = this.doc.getElementById("btnEdit");
  this.btnUninstall = this.doc.getElementById("btnUninstall");
  this.pagesControl = new PagesControl(this.doc.getElementById("pages-control"));
  this.chkEnabled = this.doc.getElementById("chkEnabled");

  this.listbox.addEventListener("select", this.updateDetails, false);
  this.btnEdit.addEventListener("command", this.handleEditButton, false);
  this.btnUninstall.addEventListener("command", this.handleUninstallButton, false);
  this.chkEnabled.addEventListener("command", this.handleEnabledClicked, false);
}

ManageUI.prototype.handleEnabledClicked = function(e) {
   if (this.selectedScript) {
    this.selectedScript.enabled = this.chkEnabled.checked;

     if (this.selectedScript.enabled) {
       this.listbox.selectedItem.style.color = '';
     } else {
       this.listbox.selectedItem.style.color = 'gray';
     }
  }
}

ManageUI.prototype.handleOkButton = function() {
  for (var i = 0, script = null; (script = this.uninstallList[i]); i++) {
    var idx = this.config.find(script.namespace, script.name);
    this.config.scripts.splice(idx, 1);
  }

  this.config.save();

  var chkUninstallPrefs = this.doc.getElementById('chkUninstallPrefs');    
  for (var i = 0, script = null; (script = this.uninstallList[i]); i++) {
    getScriptFile(script.filename).remove(false);
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
}

ManageUI.prototype.updateDetails = function() {
  if (this.listbox.selectedCount == 0) {
    this.selectedScript = null;
    this.header.textContent = " ";
    this.description.textContent = " ";
    this.chkEnabled.checked = true;
    this.pagesControl.clear();
    this.doc.documentElement.getButton("accept").disabled = false;
  }
  else {
    this.selectedScript = this.listbox.getSelectedItem(0).script;
    this.header.textContent = this.selectedScript.name;
    this.description.textContent = this.selectedScript.description;
    this.chkEnabled.checked = this.selectedScript.enabled;
    this.pagesControl.populate(this.selectedScript);
  }
}

ManageUI.prototype.handleEditButton = function() {
  if(this.selectedScript) {
    openInEditor(getScriptFile(this.selectedScript.filename), this.win);
  }
}

ManageUI.prototype.handleUninstallButton = function() {
  this.uninstallList.push(this.selectedScript);
  this.listbox.removeChild(this.listbox.childNodes[this.listbox.selectedIndex]);

  if (this.listbox.childNodes.length > 0) {
    this.chooseScript(Math.max(Math.min(this.listbox.selectedIndex, this.listbox.childNodes.length - 1), 0));
  }
}

ManageUI.prototype.populateChooser = function() {
  for (var i = 0, script = null; (script = this.config.scripts[i]); i++) {
    var listitem = this.doc.createElement("listitem");

    listitem.setAttribute("label", script.name);
    listitem.setAttribute("crop", "end");
    listitem.script = script;

    if (!script.enabled) {
      listitem.style.color = 'gray';
    }

    this.listbox.appendChild(listitem);
  }
}

ManageUI.prototype.chooseScript = function(index) {
  this.listbox.selectedIndex = index;      
  this.listbox.focus();
}

ManageUI.prototype.toggleScript = function(index, enableFlag) {
  var listitem = this.listbox.childNodes[index];

  if (enableFlag) {
    listitem.script.enabled = true;
    listitem.style.color = '';
  } else {
    listitem.script.enabled = false;
    listitem.style.color = 'gray';
  }
}
