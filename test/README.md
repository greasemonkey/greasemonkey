To set up, first install `npm.`  Then at the top level directory, execute:

    $ npm install --save-dev

To run the tests, just do one of:

    $ npm test
    $ make test

You can also launch the tests in an endless mode which watches for edits and
re-runs tests after every change with one of:

    $ npm run test -- --no-single-run
    $ make testwatch

To run the tests exactly once.
Further, to generate a code coverage report you can run one of:

    $ npm run test -- --coverage
    $ make coverage
