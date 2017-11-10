To set up, first install `npm.`  Then at the top level directory, execute:

    $ npm install --save-dev

To run the tests, just:

    $ npm test

This will launch in an endless mode which watches for edits and re-runs tests
after every change.  You can also use either of:

    $ npm run test -- --single-run
    $ make testonce

To run the tests exactly once.  Further, you can run either of:

    $ npm run test -- --single-run --coverage
    $ make coverage

To generate a code coverage report.
