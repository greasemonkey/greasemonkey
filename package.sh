#!/bin/bash

set -e
set -x

VER=$(sed -n -e '/"version"/{ s/.*: "//; s/".*//; p; q}' manifest.json)

zip -r -9 greasemonkey-${VER}.xpi \
  _locales skin src LICENSE.mit manifest.json
