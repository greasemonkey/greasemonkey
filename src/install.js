// Loosely based on Extension Developer's install.js
// More info: http://www.xulplanet.com/tutorials/xultu/xpiscript.html

const APP_DISPLAY_NAME = "Greasemonkey";
const APP_NAME = "greasemonkey";
const APP_PACKAGE = "/greasemonkey.mozdev.org/greasemonkey";
// NOTE : build.sh will correct the APP_VERSION, if applicable
const APP_VERSION = "0.8.20071218.0";
// NOTE : build.sh will add additional locales, if applicable
const APP_LOCALES = [ "en-US" ];
const APP_PREFS_FILE="defaults/preferences/greasemonkey.js";
const APP_XPCOM_SERVICES = [
  "components/gmIBrowserWindow.xpt",
  "components/gmIGreasemonkeyService.xpt",
  "components/gmIMenuCommand.xpt",
  "components/greasemonkey.js"
];

/********************************************************************************
  en-US Localized strings
 ********************************************************************************/
const MSG_ADDING = 'Adding ' + APP_PREFS_FILE + ' in ';
const MSG_ERRCODE = 'Error code:';
const MSG_PROMPT = 'Do you wish to install ' + APP_DISPLAY_NAME + ' to your profile?\n'
                   + 'If you are in doubt, this is the preferred option: Select OK.\n'
                   + '(Select Cancel to install in the Mozilla directory.)';
const MSG_RETRYING = 'Chrome registration problem. This maybe transient, trying again...';
const MSG_SUCCESS = APP_DISPLAY_NAME + ' ' + APP_VERSION + ' has been succesfully installed.\n'
                    + 'Please restart your browser before continuing.';

const MSG_FAILAPPNAME = 'Failed to create ' + APP_NAME + '\n'
                        + 'You probably do not have appropriate permissions \n'
                        + '(write access to profile or chrome directory). \n'
                        + '_____________________________\nError code:';

const MSG_FAILWARNING = 'WARNING: PARTIAL INSTALLATION\n'
                        + 'A component requiring write permissions failed in the SeaMonkey program directory.\n'
                        + 'You will need to either reinstall ' + APP_DISPLAY_NAME + 'once as Adminstrator or root\n'
                        + 'or install SeaMonkey in a user-writable location.';

const MSG_FAILINST = 'Install failed! Error code:';

const MSG_TRANSIENT = 'This specific error may be transient:'
                      + '\nIf you retry the install again, it may go away.';

/********************************************************************************
  function PerformInstall
 ********************************************************************************/
function PerformInstall(tryAgain) {
  var err, i, j;
  initInstall(APP_NAME, APP_PACKAGE, APP_VERSION);

  if (tryAgain) {
    // profile installs only work since 2003-03-06
    InstToProfile = buildID > 2003030600 && confirm(MSG_PROMPT);
  }

  var chromef = InstToProfile ? getFolder("Profile", "chrome") : getFolder("chrome");
  err = addDirectory(APP_PACKAGE, APP_VERSION, "chrome", chromef, APP_NAME, null);

  if (APP_PREFS_FILE && (err == SUCCESS)) {
    const prefDirs = [
      getFolder(getFolder("Profile"), "pref"),
      getFolder(getFolder(getFolder("Program"), "defaults"), "pref")
    ];
    for (i = prefDirs.length; i-- > 0;) {
      var prefDir = prefDirs[ i ];
      if (!File.exists(prefDir)) {
        File.dirCreate(prefDir);
      }
      err = addFile(APP_PACKAGE, APP_VERSION, APP_PREFS_FILE, prefDir, null, true);
      logComment( MSG_ADDING + prefDir + MSG_ERRCODE + err);
    }
  }

  if (err == SUCCESS) {
    var thisf = getFolder(chromef, APP_NAME);
    const INSTFLAGS = (InstToProfile) ? PROFILE_CHROME : DELAYED_CHROME;

    registerChrome(CONTENT | INSTFLAGS, getFolder(getFolder(thisf, "chromeFiles"), "content"));

    j = APP_LOCALES.length;
    for (i = 0; i < j; ++i) {
      registerChrome(
        LOCALE | INSTFLAGS,
        getFolder(getFolder(getFolder(thisf, "chromeFiles"), "locale"), APP_LOCALES[ i ])
      );
    }

    //registerChrome(SKIN | INSTFLAGS, ...);

    // register Components
    thisf = getFolder("Components");
    var errXPCOM = SUCCESS;
    i =  APP_XPCOM_SERVICES.length;
    if ( i > 0 ) {
      errXPCOM = addFile(APP_PACKAGE, APP_VERSION, APP_XPCOM_SERVICES[ --i ], thisf, null, true);
      while (i-- > 0 && errXPCOM == SUCCESS ) {
        errXPCOM = addFile(APP_PACKAGE, APP_VERSION, APP_XPCOM_SERVICES[ i ], thisf, null, true);
      }
    }

    err = performInstall();
    if (err == -239 && tryAgain) {
      alert(MSG_RETRYING);
        cancelInstall(err);
          PerformInstall(false);
            return;
    }

    if (err == SUCCESS || err == 999) {
      if (errXPCOM != SUCCESS) {
        alert(MSG_FAILWARNING + errXPCOM);
          err = errXPCOM;
          cancelInstall(err);
            return;
      } else {
        alert(MSG_SUCCESS);
          return;
      }
    } else {
      alert(((err == -239) ? MSG_FAILINST + '\n'+ MSG_TRANSIENT : MSG_FAILINST) + err);
        cancelInstall(err);
          return;
    }
  } else {
    alert( MSG_FAILAPPNAME + err);
      cancelInstall(err);
        return;
  }
};

var InstToProfile = true;

PerformInstall(true);
