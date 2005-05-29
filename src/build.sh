#!/bin/sh

rm -rf build
mkdir -p build/chrome/greasemonkey
cp install.rdf build/
cp install.js build/
cp -r content build/chrome/greasemonkey/
cd build
find * | grep -v '\/CVS' | zip greasemonkey.xpi -@
mv greasemonkey.xpi ../
