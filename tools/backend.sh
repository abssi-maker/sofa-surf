#!/bin/zsh
# backend.sh: run the backend on real Nova, logging to $LOG (default /tmp/sofasurf-backend.log).
# The access log carries the app's test events (see events.sh).
LOG=${LOG:-/tmp/sofasurf-backend.log}
cd ${0:A:h}/../server && exec uv run uvicorn server:app --host 0.0.0.0 --port 8788 --env-file .env > $LOG 2>&1
