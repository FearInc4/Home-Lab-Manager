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
