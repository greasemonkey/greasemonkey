#!/bin/sh

set -e

U=./modules/util.js
sed -i -e '/util.sh/,$d' $U
echo '// Do not edit below this line.  Use `util.sh` to auto-populate.' >> $U
(cd ./modules/util; ls *.js | sort | sed -e 's/\.js//') | while read F; do
  #echo "Cu.import('resource://greasemonkey/util/$F.js', GM_util);" >> $U
  echo "XPCOMUtils.defineLazyModuleGetter(GM_util, '$F', 'resource://greasemonkey/util/$F.js');" >> $U
done
