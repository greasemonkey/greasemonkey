module.exports = function(config) {
  config.set({
   files: [
      "./third-party/initrc/initrc.js",
      './test/third-party/chai/chai.js',
      './node_modules/sinon-chrome/bundle/sinon-chrome-webextensions.min.js',
      './test/setup.js',
      './third-party/convert2RegExp.js',
      './third-party/MatchPattern.js',
      './third-party/jszip/jszip.min.js',
      './src/**/*.js',
      './test/**/*.test.js',
      "./third-party/initrc/start.js",
      {'pattern': './skin/**', 'included': false, 'served': true},
    ],
    exclude: [
      './src/i18n.js',  // Use test set up version instead.
      './src/**/*.run.js',
      './src/content/edit-user-script.js',  // CodeMirror dependency.
      './src/content/install-dialog.js',  // Not ready for testing yet.  TODO!
      './src/util/rivets-formatters.js',
    ],
    frameworks: ['mocha', 'sinon', 'sinon-chrome'],
    preprocessors: config.coverage
        ? {'src/**/*.js': ['coverage']}
        : {},
    reporters: process.env.KARMA_REPORTER
        ? [process.env.KARMA_REPORTER]
        : ['coverage', 'progress'],
    port: 7328,
    colors: true,
    logLevel: config.LOG_WARN,
    autoWatch: true,

    browsers: ['FirefoxHeadless'],
    // https://github.com/karma-runner/karma-firefox-launcher/issues/76
    customLaunchers: {
      FirefoxHeadless: {
        base: 'Firefox',
        flags: [ '-headless' ],
      },
    },

    singleRun: true,
    concurrency: Infinity
  })
};
