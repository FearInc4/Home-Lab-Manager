#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL_APP="$ROOT/local-app"

rm -rf "$LOCAL_APP"
mkdir -p "$LOCAL_APP/public"

echo "Building the Homelab Manager dashboard..."
(cd "$ROOT" && PORT=8787 BASE_PATH=/ pnpm --filter @workspace/homelab run build)
cp -R "$ROOT/artifacts/homelab/dist/public/." "$LOCAL_APP/public/"

echo "Building the local API server..."
(cd "$ROOT" && node artifacts/api-server/build-local.mjs)
mv "$LOCAL_APP/local-server.mjs" "$LOCAL_APP/server.mjs"
if [ -f "$LOCAL_APP/local-server.mjs.map" ]; then
  mv "$LOCAL_APP/local-server.mjs.map" "$LOCAL_APP/server.mjs.map"
fi

mkdir -p "$LOCAL_APP/Homelab Manager.app/Contents/MacOS"
mkdir -p "$LOCAL_APP/Homelab Manager.app/Contents/Resources"
cp -R "$LOCAL_APP/public" "$LOCAL_APP/Homelab Manager.app/Contents/Resources/public"
cp "$LOCAL_APP"/*.mjs "$LOCAL_APP/Homelab Manager.app/Contents/Resources/"
cp "$LOCAL_APP"/*.mjs.map "$LOCAL_APP/Homelab Manager.app/Contents/Resources/"

cat > "$LOCAL_APP/Homelab Manager.app/Contents/Resources/launch-local.sh" <<'LAUNCHER'
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
LAUNCHER
chmod +x "$LOCAL_APP/Homelab Manager.app/Contents/Resources/launch-local.sh"

cat > "$LOCAL_APP/Homelab Manager.app/Contents/MacOS/Homelab Manager" <<'APPBIN'
#!/bin/bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../Resources" && pwd)"
exec "$DIR/launch-local.sh"
APPBIN
chmod +x "$LOCAL_APP/Homelab Manager.app/Contents/MacOS/Homelab Manager"

cat > "$LOCAL_APP/Homelab Manager.app/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDisplayName</key>
  <string>Homelab Manager</string>
  <key>CFBundleExecutable</key>
  <string>Homelab Manager</string>
  <key>CFBundleIdentifier</key>
  <string>local.homelab.manager</string>
  <key>CFBundleName</key>
  <string>Homelab Manager</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>LSMinimumSystemVersion</key>
  <string>11.0</string>
</dict>
</plist>
PLIST

cat > "$LOCAL_APP/start.command" <<'START'
#!/bin/bash
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if curl -fsS http://127.0.0.1:8787/api/healthz >/dev/null 2>&1; then
  open "http://127.0.0.1:8787"
  exit 0
fi
nohup /usr/bin/env node "$DIR/server.mjs" > "$DIR/homelab.log" 2>&1 &
echo $! > "$DIR/homelab.pid"
sleep 1
open "http://127.0.0.1:8787"
START
chmod +x "$LOCAL_APP/start.command"

cat > "$LOCAL_APP/stop.command" <<'STOP'
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
STOP
chmod +x "$LOCAL_APP/stop.command"

cat > "$LOCAL_APP/README.md" <<'README'
# Homelab Manager for macOS

This is a standalone local build of Homelab Manager. It runs only on your Mac and stores service configuration in:

`~/Library/Application Support/Homelab Manager/services.json`

## Requirements

- macOS 11 or newer
- Node.js 20 or newer

## Start

Double-click **Homelab Manager.app**.

If macOS blocks the unsigned app, control-click it, choose **Open**, then confirm. You can also double-click `start.command`.

The dashboard opens at:

`http://127.0.0.1:8787`

## Stop

Double-click `stop.command`, or close the server process from Activity Monitor.

## Add local services

Use the dashboard's **Services → Add Service** flow. Enter the LAN URL for the service, for example:

- `http://192.168.1.50:32400` for Plex
- `http://192.168.1.50:8989` for Sonarr
- `http://192.168.1.50:7878` for Radarr
- `http://192.168.1.50:8080` for qBittorrent

Click **Test Connection** before saving. The test runs from the Mac, so it can reach services on your home network.

## Troubleshooting

- View `homelab.log` next to `start.command` for launcher logs.
- The packaged app's runtime log is inside `Homelab Manager.app/Contents/Resources/homelab.log`.
- If a service cannot be reached, make sure macOS and the media server are on the same network and that the service is listening on its LAN interface.
README

echo "Creating the macOS app bundle..."
(
  cd "$ROOT"
  rm -f "Homelab-Manager-macOS.zip"
  zip -qr "Homelab-Manager-macOS.zip" local-app
)

echo "Created: $ROOT/Homelab-Manager-macOS.zip"