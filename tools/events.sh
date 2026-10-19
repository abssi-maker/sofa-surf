#!/bin/zsh
# events.sh: the app's test events (beacons), decoded from the backend's access log.
LOG=${LOG:-/tmp/sofasurf-backend.log}
grep -ao 'ev=[^ ]*' $LOG | sed 's/^ev=//' | python3 -c 'import sys,urllib.parse;[print(urllib.parse.unquote(l.strip())) for l in sys.stdin]'
