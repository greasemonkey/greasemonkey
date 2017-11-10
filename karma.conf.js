module.exports = function(config) {
  config.set({
    files: [
      './node_modules/sinon-chrome/bundle/sinon-chrome-webextensions.min.js',
      './test/setup.js',
      './src/**/*.js',
      './test/**/*.test.js',
    ],
    exclude: [
      './src/**/*.run.js',
      './src/content/**/*.js',  // For now ...
      './src/content/cm-addons/**/*.js',
      './src/util/rivets-formatters.js',
    ],
    frameworks: ['mocha', 'sinon-chai', 'sinon-chrome'],
    preprocessors: config.coverage
        ? {'src/**/*.js': ['coverage']}
        : {},
    reporters: ['coverage', 'progress'],
    port: 7328,
    colors: true,
    logLevel: config.LOG_WARN,
    autoWatch: true,
    browsers: ['Firefox'],
    singleRun: false,
    concurrency: Infinity
  })
}
