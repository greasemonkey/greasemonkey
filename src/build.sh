#!/bin/sh

rm -rf build
mkdir -p build/chrome/greasemonkey
cp install.rdf build/
cp -r content build/chrome/greasemonkey/
cd build
find * -not -name 'build.xml' | grep -v '\/CVS' | zip greasemonkey.xpi -@
mv greasemonkey.xpi ../
