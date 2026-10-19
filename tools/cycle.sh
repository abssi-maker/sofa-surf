#!/bin/zsh
# cycle.sh: typecheck, release build, reinstall, launch, then press $OPEN (default ENTER: the Home pill)
# and print the page's events after $WAIT seconds. Builds with the Virtual Device stopped (8 GB Mac).
T=${0:A:h}; LOG=${LOG:-/tmp/sofasurf-backend.log}
source ~/vega/env
cd $T/../app || exit 1
npx tsc --noEmit -p . || exit 1
vega virtual-device stop >/dev/null 2>&1
npm run build:app 2>&1 | grep -q "build-vega completed" || { echo BUILD_FAILED; exit 1; }
vega virtual-device start 2>&1 | tail -1
vega device install-app -p build/aarch64-release/clicker_aarch64.vpkg 2>&1 | tail -1
for i in 1 2 3; do
  vega device launch-app -a com.clicker.app.main >/dev/null 2>&1; sleep 6
  vega device running-apps | grep -q clicker && break
done
vega device running-apps | grep clicker || { echo NOT_RUNNING; exit 1; }
: > $LOG
$T/key.sh ${=OPEN:-ENTER}
sleep ${WAIT:-12}
LOG=$LOG $T/events.sh
