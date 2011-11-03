var GMInstall = {
  init: function() {
    this._htmlNs = "http://www.w3.org/1999/xhtml";

    this._scriptDownloader = window.arguments[0];
    this._script = this._scriptDownloader.script;

    this.setupIncludes("includes", "includes-desc", this._script.includes);
    this.setupIncludes("excludes", "excludes-desc", this._script.excludes);
    var matches = [];
    for (var i = 0, match = null; match = this._script.matches[i]; i++) {
      matches.push(match.pattern);
    }
    this.setupIncludes("matches", "matches-desc", matches);

    this._dialog = document.documentElement;
    this._extraButton = this._dialog.getButton("extra1");
    this._extraButton.setAttribute("type", "checkbox");

    this._acceptButton = this._dialog.getButton("accept");
    this._acceptButton.baseLabel = this._acceptButton.label;

    this._timer = null;
    this._seconds = 0;
    this.startTimer();

    this.bundle = document.getElementById("gm-browser-bundle");

    var heading = document.getElementById("heading");
    heading.appendChild(document.createTextNode(
        this.bundle.getString("greeting.msg")));

    var desc = document.getElementById("scriptDescription");
    desc.appendChild(document.createElementNS(this._htmlNs, "strong"));
    desc.firstChild.appendChild(document.createTextNode(this._script.name));
    if (this._script.version) {
      desc.appendChild(document.createTextNode(' ' + this._script.version));
    }
    desc.appendChild(document.createElementNS(this._htmlNs, "br"));
    desc.appendChild(document.createTextNode(this._script.description));
  },

  onFocus: function(e) {
    this.startTimer();
  },

  onBlur: function(e) {
    this.stopTimer();
  },

  startTimer: function() {
    this._seconds = 4;
    this.updateLabel();

    if (this._timer) {
      window.clearInterval(this._timer);
    }

    this._timer = window.setInterval(function() { GMInstall.onInterval(); }, 500);
  },

  onInterval: function() {
    this._seconds--;
    this.updateLabel();

    if (this._seconds == 0) {
      this._timer = window.clearInterval(this._timer);
    }
  },

  stopTimer: function() {
    this._seconds = 5;
    this._timer = window.clearInterval(this._timer);
    this.updateLabel();
  },

  updateLabel: function() {
    if (this._seconds > 0) {
      this._acceptButton.focus();
      this._acceptButton.disabled = true;
      this._acceptButton.label = this._acceptButton.baseLabel + " (" + this._seconds + ")";
    } else {
      this._acceptButton.disabled = false;
      this._acceptButton.label = this._acceptButton.baseLabel;
    }
  },

  setupIncludes: function(box, desc, includes) {
    if (includes.length > 0) {
      desc = document.getElementById(desc);
      document.getElementById(box).style.display = "";

      for (var i = 0; i < includes.length; i++) {
        desc.appendChild(document.createTextNode(includes[i]));
        desc.appendChild(document.createElementNS(this._htmlNs, "br"));
      }

      desc.removeChild(desc.lastChild);
    }
  },

  onOK: function() {
    this._scriptDownloader.installScript();
    window.setTimeout(window.close, 0);
  },

  onCancel: function(){
    this._scriptDownloader.cleanupTempFiles();
    window.close();
  },

  onShowSource: function() {
    this._scriptDownloader.showScriptView();
    window.setTimeout(window.close, 0);
  }
};

// See: closewindow.xul .
function GM_onClose() {
  GMInstall.onCancel();
}
