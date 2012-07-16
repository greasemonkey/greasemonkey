Components.utils.import('resource://greasemonkey/prefmanager.js');
Components.utils.import('resource://greasemonkey/util.js');

var gRemoteScript = window.arguments[0].wrappedJSObject[0];
var gBrowser = window.arguments[0].wrappedJSObject[1];
var gScript = window.arguments[0].wrappedJSObject[2];
var gHtmlNs = 'http://www.w3.org/1999/xhtml';

var gAcceptButton = null;
var gCurrentDelay = null;
var gProgress = 0;
var gShowScriptButton = null;
var gTimer = null;
var gTotalDelay = new GM_PrefManager().getValue('installDelay', 5);

function init() {
  setUpIncludes('includes', 'includes-desc', gScript.includes);
  setUpIncludes('excludes', 'excludes-desc', gScript.excludes);

  var matches = [];
  for (var i = 0, match = null; match = gScript.matches[i]; i++) {
    matches.push(match.pattern);
  }
  setUpIncludes('matches', 'matches-desc', matches);

  gShowScriptButton = document.documentElement.getButton('extra1');
  gAcceptButton = document.documentElement.getButton('accept');
  gAcceptButton.baseLabel = gAcceptButton.label;

  startTimer();

  var bundle = document.getElementById('gm-browser-bundle');

  document.getElementById('heading').appendChild(
      document.createTextNode(bundle.getString('greeting.msg')));

  var desc = document.getElementById('scriptDescription');
  desc.appendChild(document.createElementNS(gHtmlNs, 'strong'));
  desc.firstChild.appendChild(document.createTextNode(gScript.name));
  if (gScript.version) {
    desc.appendChild(document.createTextNode(' ' + gScript.version));
  }
  desc.appendChild(document.createElementNS(gHtmlNs, 'br'));
  desc.appendChild(document.createTextNode(gScript.description));

  if (gRemoteScript.done) {
    // Download finished before we could open, fake a progress event.
    onProgress(null, null, 1);
  } else {
    // Otherwise, listen for future progress events.
    gRemoteScript.onProgress(onProgress);
  }
}

function onBlur(e) {
  stopTimer();
}

function onCancel() {
  gRemoteScript.cleanup();
  window.close();
}

function onFocus(e) {
  startTimer();
}

function onInterval() {
  gCurrentDelay--;
  updateLabel();

  if (gCurrentDelay == 0) stopTimer();
}

function onOk() {
  gRemoteScript.install();
  window.setTimeout(window.close, 0);
}

function onProgress(aRemoteScript, aEventType, aData) {
  if (!document) return; // lingering download after window cancel
  gProgress = Math.floor(100 * aData);
  if (gRemoteScript.done) {
    document.getElementById('loading').style.display = 'none';
    if (gRemoteScript.errorMessage) {
      document.documentElement.getButton('extra1').disabled = true;
      document.getElementById('dialogContentBox').style.display = 'none';
      document.getElementById('errorContentBox').style.display = '-moz-box';
      document.getElementById('errorMessage')
          .textContent = gRemoteScript.errorMessage;
      stopTimer();
      updateLabel(false);
      return;
    }
  } else {
    document.getElementById('progressmeter').setAttribute('value', gProgress);
  }
  updateLabel();
}

function onShowSource() {
  gRemoteScript.showSource(gBrowser);
  window.setTimeout(window.close, 0);
}

function pauseTimer() {
  stopTimer();
  gCurrentDelay = gTotalDelay;
  updateLabel();
}

function setUpIncludes(box, desc, includes) {
  if (includes.length > 0) {
    desc = document.getElementById(desc);
    document.getElementById(box).style.display = '';

    for (var i = 0; i < includes.length; i++) {
      desc.appendChild(document.createTextNode(includes[i]));
      desc.appendChild(document.createElementNS(gHtmlNs, 'br'));
    }

    desc.removeChild(desc.lastChild);
  }
}

function startTimer() {
  gCurrentDelay = gTotalDelay;
  updateLabel();

  gTimer = window.setInterval(onInterval, 500);
}

function stopTimer() {
  if (gTimer) window.clearInterval(gTimer);
  gCurrentDelay = 0;
}

function updateLabel(aOkAllowed) {
  if ('undefined' == typeof aOkAllowed) aOkAllowed = true;

  if (gCurrentDelay > 0) {
    gAcceptButton.focus();
    gAcceptButton.label = gAcceptButton.baseLabel + ' (' + gCurrentDelay + ')';
  } else {
    gAcceptButton.label = gAcceptButton.baseLabel;
  }

  var disabled = aOkAllowed
      ? ((gCurrentDelay > 0) || (gProgress < 100))
      : true;
  gAcceptButton.disabled = disabled;
  gShowScriptButton.disabled = disabled;
}

// See: closewindow.xul .
function GM_onClose() {
  gRemoteScript.cleanup();
}
