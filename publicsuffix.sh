#!/bin/sh

# This script downloads the list from publicsuffix.org and uses it to regenerate
# the ".tld" feature's regular expression.
# See: https://github.com/greasemonkey/greasemonkey/issues/1351
#
# To date, this script is only expected to be comatible with GNU toolchains.

set -e

URL="https://mxr.mozilla.org/mozilla-central/source/netwerk/dns/effective_tld_names.dat?raw=1"

# Create the mega list of TLDs as a regular expression.
TLDS=`curl -s "$URL" | \
    egrep -v '^$|^//|^!' | \
    sort | \
    sed -e 's/\s.*//' -e 's/\./\\./' -e 's/^\*/[^.]+/' | \
    tr '\n' '|' | \
    sed -e 's/|$//'`
# Remove the last line, where this data lives.
sed -i -e '$d' modules/third-party/convert2RegExp.js
# Replace it with the new data.
echo "var tldStr = \"\\.(?:$TLDS)\";" >> modules/third-party/convert2RegExp.js
