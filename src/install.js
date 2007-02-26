
// Based on Extension Developer's install.js
// More info: http://www.xulplanet.com/tutorials/xultu/xpiscript.html

const APP_DISPLAY_NAME = "Greasemonkey";
const APP_PACKAGE = "/greasemonkey.mozdev.org/greasemonkey";
const APP_NAME = "/greasemonkey";
// TODO: figure out how to extract this from install.rdf
//   or generate install.rdf ...
const APP_VERSION = "0.6.5.20060726";

var instFlags = DELAYED_CHROME;

// So, some wierd thing causes extension manager in FF to sometimes fail when
// trying to delete the temporary xpi file in the last step of installing gm.
// Unfortunately, the error handling sucks so it interprets any failure
// whatsoever as a missing install.rdf and falls back on this file.
// If this file were to run on FF it would create strange really incorrect
// behavior and just generally be bad since it is the Seamonkey installer.
//
// So... this is a lame attempt at detecting whether we are on Firefox. If so,
// we do nothing. If not, we assume we're in Seamonkey and continue.
var ffExtFolder = getFolder("Profile", "extensions");
if (!File.exists(ffExtFolder)) {

  var chromef = getFolder("Profile", "chrome/greasemonkey/");

  initInstall(APP_NAME, APP_PACKAGE, APP_VERSION);

  var err = addDirectory(APP_PACKAGE, APP_VERSION, "chrome/greasemonkey", chromef, null);

  if(err >= SUCCESS) {
          registerChrome(CONTENT | instFlags, getFolder( "Profile", "chrome/greasemonkey/content/" ));
          //registerChrome(LOCALE  | instFlags, ...);
          //registerChrome(SKIN  | instFlags, ...);
          err = performInstall();
          if(err >= SUCCESS) {
                  alert(APP_DISPLAY_NAME + " " + APP_VERSION + " has been succesfully installed.\n"
                          +"Please restart your browser before continuing.");
          } else {
                  alert("Install failed. Error code:" + err);
                  cancelInstall(err);
          }
  } else {
          alert("Failed to create chrome directory\n"
                  +"You probably don't have appropriate permissions \n"
                  +"(write access to Profile/chrome directory). \n"
                  +"_____________________________\nError code:" + err);
          cancelInstall(err);
  }
}
