#!/bin/sh

set -e

U=./modules/util.js
sed -i -e '/util.sh/,$d' $U
echo '// Do not edit below this line.  Use `util.sh` to auto-populate.' >> $U
(cd ./modules/util; ls *.js | sort | sed -e 's/\.js//') | while read F; do
  echo "XPCOMUtils.defineLazyModuleGetter(GM_util, '$F', 'chrome://greasemonkey-modules/content/util/$F.js');" >> $U
done
