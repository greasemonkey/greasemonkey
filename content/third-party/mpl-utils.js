/**** BEGIN LICENSE BLOCK *****
Version: MPL 1.1

The contents of this file are subject to the Mozilla Public License Version
1.1 (the "License"); you may not use this file except in compliance with
the License. You may obtain a copy of the License at
http://www.mozilla.org/MPL/

Software distributed under the License is distributed on an "AS IS" basis,
WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
for the specific language governing rights and limitations under the
License.

The Original Code is Mozilla.org Code.

The Initial Developer of the Original Code is
Netscape Communications Corporation.
Portions created by the Initial Developer are Copyright (C) 2001
the Initial Developer. All Rights Reserved.

Contributor(s):
  Blake Ross <blakeross@telocity.com> (Original Author)
  Ben Goodger <ben@bengoodger.com> (v2.0)
  Dan Mosedale <dmose@mozilla.org>
  Fredrik Holmqvist <thesuckiestemail@yahoo.se>
  Josh Aas <josh@mozilla.com>
  Shawn Wilsher <me@shawnwilsher.com> (v3.0)
  Edward Lee <edward.lee@engineering.uiuc.edu>

  Anthony Lieuallen <arantius@gmail.com>
  Mike Medley <medleymind@gmail.com>
***** END LICENSE BLOCK ****/

function GM_openFolder(aFile) {
  try {
    // Show the directory containing the file and select the file.
    aFile.QueryInterface(Components.interfaces.nsILocalFile).reveal();
  } catch (e) {
    // Either the file doesn't exist or reveal is not implemented
    var fParent = aFile.parent;

    try {
      // Lauch the parent directory if the file doesn't exist.
      if (fParent.exists()) fParent.launch();
    } catch (e) {
      // If launch also fails let the OS handler try to open the parent.
      var uri = Components.classes["@mozilla.org/network/io-service;1"]
          .getService(Components.interfaces.nsIIOService)
          .newFileURI(fParent);
      var protocolSvc = Components
          .classes["@mozilla.org/uriloader/external-protocol-service;1"]
          .getService(Components.interfaces.nsIExternalProtocolService);

      protocolSvc.loadUrl(uri);
    }
  }
}
