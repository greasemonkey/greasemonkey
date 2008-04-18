#!/bin/sh

# Set up variables
GMMAX=${1-0}
GMMIN=${2-8}
GMREL=${3-0}
GMBUILD=`date +"%Y%m%d"`
GMNAME=greasemonkey
GMVER="$GMMAX.$GMMIN.$GMBUILD.$GMREL"
GMXPI="$GMNAME-$GMVER.xpi"

# Copy base structure to a temporary build directory and change to it
echo "Creating working directory ..."
rm -rf build
mkdir build
cp -r chrome.manifest install.rdf license.txt \
	defaults components chrome \
	build/
cd build

echo "Gathering all locales into chrome.manifest ..."
GMLOC=\"en-US\"
for entry in chrome/chromeFiles/locale/*; do
  if [ $entry != en-US ]; then
    echo "locale  $GMNAME  $entry  chrome/chromeFiles/locale/$entry/" >> chrome.manifest
    GMLOC=$GMLOC,\ \"$entry\"
  fi
done

echo "Patching install.rdf version ..."
sed "s!<em:version>.*</em:version>!<em:version>$GMVER</em:version>!" \
  install.rdf > install.rdf.tmp
mv install.rdf.tmp install.rdf

echo "Cleaning up unwanted files ..."
find . -depth -name '.svn' -exec rm -rf "{}" \;
find . -depth -name '*~' -exec rm -rf "{}" \;
find . -depth -name '#*' -exec rm -rf "{}" \;

echo "Creating $GMNAME.jar ..."
cd chrome
zip -qr0X "$GMNAME.jar" chromeFiles icons
rm -rf chromeFiles icons
cd ..

echo "Patching chrome.manifest with jar ..."
sed -e "/^content/s#\(.*\) chrome/\(.*\)#\1 jar:chrome/$GMNAME.jar!/\2#" \
    -e  "/^locale/s#\(.*\) chrome/\(.*\)#\1 jar:chrome/$GMNAME.jar!/\2#" \
    -e    "/^skin/s#\(.*\) chrome/\(.*\)#\1 jar:chrome/$GMNAME.jar!/\2#" \
    chrome.manifest > chrome.manifest.jar
mv chrome.manifest.jar chrome.manifest

echo "Creating $GMXPI ..."
zip -qr9X "../$GMXPI" *

echo "Cleaning up temporary files ..."
cd ..
rm -rf build
