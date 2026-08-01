#!/bin/bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$DIR/homelab.pid" ]; then
  kill "$(cat "$DIR/homelab.pid")" 2>/dev/null || true
  rm -f "$DIR/homelab.pid"
  echo "Homelab Manager stopped."
else
  echo "Homelab Manager is not running from this folder."
fi
