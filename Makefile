.PHONY: test testonce coverage xpi

test:
	@npm run test

testonce:
	@npm run test -- --single-run

coverage:
	@npm run test -- --coverage --single-run
	echo "file://$(shell ls $$PWD/coverage/*/*.html|sed -e 's/ /%20/g')"

xpi:
	@sh package.sh
