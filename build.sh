#!/bin/sh

# Set up variables
if [ "official" = "$1" ]; then
    # For official builds, use the version in install.rdf.
	GMVER=`sed -ne '/em:version/{ s/.*>\(.*\)<.*/\1/; p}' install.rdf`
else
    # For beta builds, generate a version number.
    GMVER=`date +"%Y.%m.%d.beta"`
fi
GMXPI="greasemonkey-$GMVER.xpi"

# Copy base structure to a temporary build directory and change to it
echo "Creating working directory ..."
rm -rf build
mkdir build
cp -r \
	chrome.manifest components content defaults install.rdf license.txt locale skin \
	build/
cd build

if [ "official" != "$1" ]; then
  echo "Patching install.rdf version ..."
  sed -i "s/<em:version>.*<\/em:version>/<em:version>$GMVER<\/em:version>/" \
    install.rdf
fi

echo "Gathering all locales into chrome.manifest ..."
for entry in locale/*; do
  entry=`basename $entry`
  if [ $entry != en-US ]; then
    echo "locale  greasemonkey  $entry  locale/$entry/" >> chrome.manifest
  fi
done

echo "Creating greasemonkey.jar ..."
sed -i \
    -e "s/^content  *\([^ ]*\)  *\([^ ]*\)/content \1 jar:chrome\/greasemonkey.jar!\/\2/" \
    -e "s/^skin  *\([^ ]*\)  *\([^ ]*\)  *\([^ ]*\)/skin \1 \2 jar:chrome\/greasemonkey.jar!\/\3/" \
    -e "s/^locale  *\([^ ]*\)  *\([^ ]*\)  *\([^ ]*\)/locale \1 \2 jar:chrome\/greasemonkey.jar!\/\3/" \
    chrome.manifest
find content/ skin/ locale/ | sort | \
  zip -r -0 -@ "greasemonkey.jar" > /dev/null
rm -fr content/ skin/ locale/
mkdir chrome
mv greasemonkey.jar chrome/

echo "Cleaning up unwanted files ..."
find . -depth -name '*~' -exec rm -rf "{}" \;
find . -depth -name '#*' -exec rm -rf "{}" \;

echo "Creating $GMXPI ..."
zip -qr9X "../$GMXPI" *

echo "Cleaning up temporary files ..."
cd ..
rm -rf build
