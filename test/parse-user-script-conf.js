module.exports = function(config) {
  config.set({
    frameworks: ['chai', 'mocha'],
    files: [
      '../src/parse-meta-line.js',
      '../src/parse-user-script.js',

      'parse-user-script-test.js',
    ],

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress'],

    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Firefox'],
    singleRun: false,
    concurrency: Infinity
  })
}
