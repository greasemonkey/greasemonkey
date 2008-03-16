function PagesControl(ctlPages) {
  var includesBox = new PagesBox(document.getElementById("grpIncluded"));
  var excludesBox = new PagesBox(document.getElementById("grpExcluded"));

  this.notifyEvent = function(script, event, data) {
    switch (event) {
    case "edit-include-add": includesBox.pageAdded(data); break;
    case "edit-include-remove": includesBox.pageRemoved(data); break;
    case "edit-exclude-add": excludesBox.pageAdded(data); break;
    case "edit-exclude-remove": excludesBox.pageRemoved(data); break;
    }
  };

  this.script = null;
  this.populate = function(script) {
    this.clear();
    includesBox.populate(script, 'includes', script.includes);
    excludesBox.populate(script, 'excludes', script.excludes);
    this.script = script;
    GM_getConfig().addObserver(this, this.script);
  };

  this.clear = function() {
    if (this.script == null) return;
    GM_getConfig().removeObserver(this, this.script);
    includesBox.clear();
    excludesBox.clear();
    this.script = null;
  };

  function PagesBox(grpBox) {
    var buttons = grpBox.getElementsByTagName("button");
    var self = this;
    var selectedPage = null;

    this.script = null;
    this.type = null;
    this.groupbox = grpBox;
    this.listbox = grpBox.getElementsByTagName("listbox")[0];
    this.btnAdd = buttons[0];
    this.btnRemove = buttons[1];

    this.listbox.addEventListener("select", updatePagesBox, true);
    this.btnAdd.addEventListener("command", promptForNewPage, true);
    this.btnRemove.addEventListener("command", remove, true);

    this.populate = function(script, type, pages) {
      this.clear();
      this.script = script;
      this.type = type;

      for (var i = 0, page = null; (page = pages[i]); i++) {
        addPage(page);
      }
    };

    this.clear = function() {
      this.script = null;
      this.type = null;

      while (this.listbox.hasChildNodes()) {
        this.listbox.removeChild(this.listbox.childNodes[0]);
      }
    };

    function updatePagesBox(ev) {
      selectedPage = self.listbox.getSelectedItem(0);
      self.btnRemove.disabled = selectedPage == null;
    };

    function promptForNewPage(ev) {
      var gmManageBundle = document.getElementById("gm-manage-bundle");
      var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                  .getService();
      var wmi = wm.QueryInterface(Components.interfaces.nsIWindowMediator);
      var win = wmi.getMostRecentWindow("navigator:browser");
      var currentSite = GM_isGreasemonkeyable(win.content.location.href)
                        ? win.content.location.protocol + "//" +
                          win.content.location.hostname + "/*"
                        : gmManageBundle.getString("promptForNewPage.defVal");
      var val = gmPrompt(
        gmManageBundle.getString("promptForNewPage.msg"),
        currentSite,
        gmManageBundle.getString("promptForNewPage.title"));

      if (val && val != "") {
        self.type == 'includes'?
          self.script.addInclude(val):
          self.script.addExclude(val);
        dirty = true;
      }
    };

    this.pageAdded = function(val) {
      addPage(val);
    };

    function remove(ev) {
      self.type == 'includes'?
        self.script.removeIncludeAt(self.listbox.selectedIndex):
        self.script.removeExcludeAt(self.listbox.selectedIndex);

      // it's sorta wierd that the button stays focused when it is disabled because nothing is selected
      if (self.listbox.length == 0) {
        self.listbox.focus();
        dirty = true;
      }
    };

    this.pageRemoved= function(index) {
      self.listbox.removeChild(self.listbox.childNodes[index]);
    };

    function addPage(pageSpec) {
      var listitem = document.createElement("listitem");
      listitem.setAttribute("label", pageSpec);
      self.listbox.appendChild(listitem);
    };
  }
};
