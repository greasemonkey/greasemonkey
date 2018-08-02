// ==UserScript==
// @name        GM.xmlhttpRequest() test w/ XML.
// @description Exercise the XHR API, downloading an XML file.
// @version     1
// @grant       GM.xmlHttpRequest
// ==/UserScript==

GM.xmlHttpRequest({
  method: 'GET',
  url: 'http://google.com/sitemap.xml',
  onload: function(response) {
    console.log('GM_xmlhttpRequest works: ', response.responseText.substring(0, 30));
  },
  onprogress: function(e) {
    console.log('gm_xhr onprogress lengthComputable: ', e.lengthComputable);
    console.log('gm_xhr onprogress loaded: ', e.loaded);
    console.log('gm_xhr onprogress total: ', e.total);
  }
});
