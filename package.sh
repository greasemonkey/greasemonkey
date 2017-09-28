#!/bin/bash

set -e

VER=$(sed -n -e '/"version"/{ s/.*: "//; s/".*//; p; q; }' manifest.json)
XPI="greasemonkey-${VER}.xpi"

echo "Packaging ${XPI} ..."
rm -f "${XPI}"
zip -q -r -9 "${XPI}" \
  _locales skin src LICENSE.mit manifest.json
