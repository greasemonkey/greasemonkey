#!/bin/bash

set -e
set -x

function get_version {
  while read line ; do
    if [[ "$line" == *\"version\"* ]]; then
      line="${line##*: \"}"
      line="${line%%\"*}"
      echo "$line"
      break
    fi
  done < manifest.json
}

VER=$(get_version)

zip -r -9 greasemonkey-${VER}.xpi \
  _locales skin src LICENSE.mit manifest.json
