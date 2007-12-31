#!/bin/sh
GMMAX=0
GMMIN=8
GMBUILD=`date +"%Y%m%d"`
GMREL=0

GMNAME=greasemonkey

GMVER="$GMMAX.$GMMIN.$GMBUILD.$GMREL"
GMXPI="$GMNAME-$GMVER.xpi"

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

replace () {
  TMP=`mktemp -t Greasemonkey-build.sh`
  SRC=`echo "$1" | sed 's/[\/\\\\]/\\\\&/g'`
  DST=`echo "$2" | sed 's/[\/\\\\]/\\\\&/g'`
  sed "s/$SRC/$DST/g" "$3" > "$TMP"
  if cmp -s "$3" "$TMP" ; then
    # No change! Treat as a failure to react to in caller.
    rm "$TMP"
    return 1
  fi
  cp "$TMP" "$3"
  rm "$TMP"
  return 0
}

replace '<em:version>.*</em:version>' \
        '<em:version>'$GMVER'</em:version>' \
        install.rdf

replace 'const APP_VERSION =.*' \
        'const APP_VERSION = "'$GMVER'";' \
        install.js

# sets up available locales for seamonkey
replace 'const APP_LOCALES =.*;' \
        'const APP_LOCALES = [ '$GMLOC' ];' \
        install.js

find . -name '.svn' -prune -or -name '.DS_Store' -or -name '*~' -or -name '#*' \
  -or -print | zip -9X -@ "$GMXPI"

mv "$GMXPI" ../

echo "Created $GMXPI"
exit 0
