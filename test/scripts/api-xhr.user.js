GM_xmlhttpRequest({
  method: 'GET',
  //url: 'http://localhost/',
  url: '/img/apache_pb.gif',
  onload: function(response) {
    dump('GM_xmlhttpRequest works: '
        + response.responseText.substring(0, 30) + '\n');
  },
  onprogress: function(e) {
    dump('gm_xhr onprogress lengthComputable: ' + (e.lengthComputable || '') + '\n');
    dump('gm_xhr onprogress loaded: ' + (e.loaded || '') + '\n');
    dump('gm_xhr onprogress total: ' + (e.total || '') + '\n');
  }
});
