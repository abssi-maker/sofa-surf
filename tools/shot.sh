#!/bin/zsh
# shot.sh NAME: screenshot of the Virtual Device window into $SHOTS (default /tmp/sofasurf-shots).
# Never use `screenshooter` on the device: it freezes the emulator.
SHOTS=${SHOTS:-/tmp/sofasurf-shots}; mkdir -p $SHOTS
wid=$(swift ${0:A:h}/../../goodnight-tv/demo/tools/vvd-window-id.swift)
screencapture -x -o -l"$wid" $SHOTS/$1.png && echo $SHOTS/$1.png
