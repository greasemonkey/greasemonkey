#!/bin/sh
GMMAX=0
GMMIN=8
GMREL=0

GMNAME=greasemonkey

# Copy base structure to a temporary build directory and change to it
rm -rf build
mkdir build
cp chrome.manifest build/
cp install.js build/
cp install.rdf build/
cp license.txt build/
cp -r defaults build/
cp -r components build/
cp -r chrome build/
cd build

# Generate locales for chrome.manifest from babelzilla directories, which
# we assume have been placed in locale/.
GMLOC=\"en-US\"
for entry in $(ls chrome/chromeFiles/locale/); do
  if [ $entry != en-US ]; then
    echo "locale  $GMNAME  "$entry"  chrome/chromeFiles/locale/"$entry"/" >> chrome.manifest
    GMLOC=$GMLOC,\ \"$entry\"
  fi
done

# Versioning checks
GMBUILD=`date +"%04Y%02m%02d"`
GMREGEXVER=[0-9]+\.[0-9]+\.[0-9]{8}\.[0-9]+

checkGMVER () {
  GMVER=`grep -Eo "$1" $2 | grep -Eo "$GMREGEXVER"`
  if [ ! $GMVER ]; then
    echo ERROR: $2 HAS INVALID VERSION!
    exit 1
  fi
}

sed -r -i "s/<em:version>.*<\/em:version>/<em:version>$GMMAX\.$GMMIN\.$GMBUILD\.$GMREL<\/em:version>/" install.rdf
checkGMVER "<em:version>$GMREGEXVER<\/em:version>" install.rdf

sed -r -i "s/const APP_VERSION =.*;/const APP_VERSION = \"$GMVER\";/" install.js
checkGMVER "const APP_VERSION = \"$GMREGEXVER\";" install.js

# sets up available locales for seamonkey
sed -r -i "s/const APP_LOCALES =.*;/const APP_LOCALES = [ $GMLOC ];/" install.js

find . -name '.svn' -prune -or -name '.DS_Store' -or -name '*~' -or -name '#*' \
  -or -print | zip $GMNAME-$GMVER.xpi -9X -@

mv $GMNAME-$GMVER.xpi ../../downloads/

echo Created $GMNAME-$GMVER.xpi
exit 0