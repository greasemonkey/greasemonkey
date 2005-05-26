#!/bin/sh

rm -rf build
rm -rf ./content/*.patch
mkdir -p build/chrome/greasemonkey
cp install.rdf build/
cp install.js build/
cp -r content build/chrome/greasemonkey/
cd build
find * -not -name 'build.xml' | grep -v '\/CVS' | zip greasemonkey.xpi -@
mv greasemonkey.xpi ../
