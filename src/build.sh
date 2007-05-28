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

# Generate locales for chrome.manifest from babelzilla directories, which
# we assume have been placed in locale/.
for entry in $(ls chrome/chromeFiles/locale/)
do
echo "locale  greasemonkey  "$entry"  chrome/chromeFiles/locale/"$entry"/" >> chrome.manifest
done

find * | grep -v 'CVS' | grep -v '\.svn' | grep -v ~$ | grep -v '#' | grep -v .DS_Store | zip greasemonkey.xpi -@
mv greasemonkey.xpi ../
