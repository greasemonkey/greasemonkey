// ==UserScript==
// @name        GM.xmlhttpRequest() test.
// @description Exercise the XHR API.
// @version     1
// @grant       GM.xmlHttpRequest
// ==/UserScript==

GM.xmlHttpRequest({
  method: 'GET',
  url: 'http://localhost/',
  onload: function(response) {
    console.log('GM_xmlhttpRequest works: ', response.responseText.substring(0, 30));
  },
  onprogress: function(e) {
    console.log('gm_xhr onprogress lengthComputable: ', e.lengthComputable);
    console.log('gm_xhr onprogress loaded: ', e.loaded);
    console.log('gm_xhr onprogress total: ', e.total);
  }
});
