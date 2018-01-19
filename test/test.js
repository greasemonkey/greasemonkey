const karma = require('karma');
const webdav = require('webdav-server').v2;

const webdavServer = new webdav.WebDAVServer({'port': 7329, 'maxRequestDepth': Number.POSITIVE_INFINITY});
webdavServer.start();

new karma.Server(
    karma.config.parseConfig(
        module.filename + '/../../karma.conf.js',
        {'proxies': {'/webdav/': 'http://localhost:7329/webdav/'}}),
    exitCode => {
      webdavServer.stop();
      process.exit(exitCode);
    }).start();
