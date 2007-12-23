function PagesControl(ctlPages) {
  var includesBox = new PagesBox(document.getElementById("grpIncluded"));
  var excludesBox = new PagesBox(document.getElementById("grpExcluded"));

  this.populate = function(script) {
    includesBox.populate(script.includes);
    excludesBox.populate(script.excludes);
  };

  this.clear = function() {
    includesBox.clear();
    excludesBox.clear();
  };

  function PagesBox(grpBox) {
    var buttons = grpBox.getElementsByTagName("button");
    var self = this;
    var selectedPage = null;

    this.pages = null;
    this.groupbox = grpBox;
    this.listbox = grpBox.getElementsByTagName("listbox")[0];
    this.btnAdd = buttons[0];
    this.btnEdit = buttons[1];
    this.btnRemove = buttons[2];

    this.listbox.addEventListener("select", updatePagesBox, true);
    this.btnAdd.addEventListener("command", promptForNewPage, true);
    this.btnEdit.addEventListener("command", promptForEdit, true);
    this.btnRemove.addEventListener("command", remove, true);

    this.populate = function(pages) {
      this.clear();
      this.pages = pages;

      for (var i = 0, page = null; (page = self.pages[i]); i++) {
        addPage(page);
      }
    };

    this.clear = function() {
      this.pages = null;

      while (this.listbox.hasChildNodes()) {
        this.listbox.removeChild(this.listbox.childNodes[0]);
      }
    };

    function updatePagesBox(ev) {
      selectedPage = self.listbox.getSelectedItem(0);
      self.btnEdit.disabled = selectedPage == null;
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
        addPage(val);
        self.pages.push(val);
        dirty = true;
      }
    };

    function promptForEdit(ev) {
      var gmManageBundle = document.getElementById("gm-manage-bundle");
      var val = gmPrompt(
        gmManageBundle.getString("promptForEdit.msg"),
        self.listbox.selectedItem.label,
        gmManageBundle.getString("promptForEdit.title"));

      if (val && val != "") {
        self.listbox.selectedItem.label = val;
        self.pages[self.listbox.selectedIndex] = val;

        dirty = true;
      }
    };

    function remove(ev) {
      self.pages.splice(self.listbox.selectedIndex, 1);
      self.listbox.removeChild(self.listbox.getSelectedItem(0));

      // it's sorta wierd that the button stays focused when it is disabled because nothing is selected
      if (self.listbox.length == 0) {
        self.listbox.focus();
        dirty = true;
      }
    };

    function addPage(pageSpec) {
      var listitem = document.createElement("listitem");
      listitem.setAttribute("label", pageSpec);
      self.listbox.appendChild(listitem);
    };
  }
};