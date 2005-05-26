// Based on Extension Developer's install.js
// More info: http://www.xulplanet.com/tutorials/xultu/xpiscript.html

const APP_DISPLAY_NAME = "Greasemonkey";
const APP_PACKAGE = "/greasemonkey.mozdev.org/greasemonkey";
const APP_NAME = "/greasemonkey";
// TODO: figure out how to extract this from install.rdf
//   or generate install.rdf ...
const APP_VERSION = "0.3.4";

var instFlags = DELAYED_CHROME;
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

