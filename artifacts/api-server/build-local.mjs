import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(artifactDir, "../..");
const localAppDir = path.join(workspaceRoot, "local-app");

await build({
  entryPoints: [path.join(artifactDir, "src/local-server.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  outdir: localAppDir,
  sourcemap: "linked",
  outExtension: { ".js": ".mjs" },
  logLevel: "info",
  plugins: [esbuildPluginPino({ transports: ["pino-pretty"] })],
  external: [
    "*.node",
    "fsevents",
    "pg-native",
    "sharp",
    "canvas",
    "better-sqlite3",
    "sqlite3",
  ],
  banner: {
    js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';
globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);`,
  },
});