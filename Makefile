.PHONY: test testonce coverage xpi

test:
	@npm run test

testwatch:
	@npm run test -- --no-single-run

coverage:
	@npm run test -- --coverage
	echo "file://$(shell ls $$PWD/coverage/*/*.html|sed -e 's/ /%20/g')"

xpi:
	@sh package.sh
