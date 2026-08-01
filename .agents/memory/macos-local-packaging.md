---
name: macOS local packaging
description: Durable constraints for rebuilding the standalone macOS Homelab Manager bundle.
---

The local macOS export is a Node-backed `.app` bundle rather than a fully native binary. The server bundle produced with the pino logging plugin emits sidecar `.mjs` worker files; all of them must be copied into the app’s `Contents/Resources` directory alongside the server entry. The bundled server must resolve its `public` directory relative to its own file location.

**Why:** A single copied server entry can start but fail when pino tries to load its worker modules, and a parent-relative static path works in the source tree but not inside the packaged app.

**How to apply:** When changing the local export, run the macOS build script, verify `api/healthz` and `/` against the generated server, and inspect the ZIP before presenting it.