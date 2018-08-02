#!/usr/bin/env bash

set -e

VER=$(sed -n -e '/"version"/{ s/.*: "//; s/".*//; p; q; }' manifest.json)
XPI="greasemonkey-${VER}.xpi"

echo "Packaging ${XPI} ..."
rm -f "${XPI}"
zip -q -r -9 "${XPI}" \
  _locales/*/messages.json skin src third-party LICENSE.mit manifest.json
