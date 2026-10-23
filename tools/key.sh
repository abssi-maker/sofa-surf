#!/bin/zsh
# key.sh KEY [KEY...]: press remote keys on the Virtual Device, 1.3 s apart.
# Names: UP DOWN LEFT RIGHT ENTER BACK MENU PLAYPAUSE REWIND FASTFORWARD
source ~/vega/env
for k in "$@"; do vega exec vda shell "inputd-cli button_press KEY_$k" >/dev/null 2>&1; sleep 1.3; done
