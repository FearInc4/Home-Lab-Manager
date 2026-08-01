# Media Homelab Manager

A unified dashboard to monitor and control self-hosted media server stacks — Plex, Sonarr, Radarr, Tautulli, qBittorrent, SABnzbd, and more — from a single dark mission-control UI.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/homelab run dev` — run the frontend (port 23301)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, TanStack Query, Wouter, Framer Motion
- API: Express 5 at `/api`
- DB: PostgreSQL + Drizzle ORM (`lib/db/src/schema/services.ts`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/services.ts` — services table (stores all configured media server connections)
- `artifacts/api-server/src/routes/services.ts` — CRUD + status + restart + stats
- `artifacts/api-server/src/routes/downloads.ts` — downloads list, pause, resume, remove
- `artifacts/api-server/src/routes/dashboard.ts` — aggregated dashboard stats
- `artifacts/api-server/src/lib/serviceConnector.ts` — proxy logic for each service type
- `artifacts/homelab/src/` — React frontend (pages: Dashboard, Services, Downloads, Settings)

## Architecture decisions

- The backend acts as a proxy to each media server's own API — credentials never leave the server.
- Service connector (`serviceConnector.ts`) handles status checks, stats, and download actions per service type.
- All service config (URL, API key, credentials) is stored in the `services` DB table.
- OpenAPI-first: frontend uses generated React Query hooks from `@workspace/api-client-react`.
- Dashboard aggregates status + downloads in parallel at request time (no caching yet).

## Product

Users configure their media server URLs + API keys once, then use the dashboard to:
- See which services are online/offline with response times
- View combined download queue across qBittorrent and SABnzbd
- Pause, resume, or delete downloads
- Get per-service stats (library counts, active streams, queue lengths)
- Trigger service restarts for Sonarr/Radarr/Plex

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `zod.int()` doesn't exist in zod v3 (which api-zod uses) — use `type: number` not `type: integer` in openapi.yaml
- DELETE endpoints with query params cause TS2308 naming collisions in api-zod — avoid query params on DELETE, or rename operationId to avoid `<Op>Params` clashes
- After changing `lib/db/src/schema/`, run `pnpm run typecheck:libs` before artifact typechecks or they'll see stale declarations

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
