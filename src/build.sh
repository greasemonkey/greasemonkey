#!/bin/sh

rm -rf build
mkdir build
cp chrome.manifest build/
cp install.js build/
cp install.rdf build/
cp license.txt build/
cp -r components build/
cp -r chrome build/
cd build
find * | grep -v 'CVS' | grep -v ~$ | grep -v '#' | grep -v .DS_Store | zip greasemonkey.xpi -@
mv greasemonkey.xpi ../
