#!/bin/bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$DIR/homelab.pid"
LOG_FILE="$DIR/homelab.log"

if curl -fsS http://127.0.0.1:8787/api/healthz >/dev/null 2>&1; then
  open "http://127.0.0.1:8787"
  exit 0
fi

nohup /usr/bin/env node "$DIR/server.mjs" > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"
sleep 1
open "http://127.0.0.1:8787"
