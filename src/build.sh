#!/bin/sh

rm -rf build
cd content/scripts/
find . | grep -v 'default-config\.xml' | grep -v CVS | grep -v '^.$' | xargs rm
cd ../../
mkdir -p build/chrome/greasemonkey
cp install.rdf build/
cp install.js build/
cp -r content build/chrome/greasemonkey/
cd build
find * | grep -v 'CVS' | grep -v .DS_Store | zip greasemonkey.xpi -@
mv greasemonkey.xpi ../
