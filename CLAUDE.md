# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Orbit is a self-hosted, privacy-respecting Life360-style location-sharing app for a small trusted circle (10-20 people). Currently Phase 1 (auth, circles, live map) of a multi-phase plan.

npm workspaces monorepo:
- `apps/backend` — NestJS + Prisma/Postgres API + SSE realtime endpoint
- `apps/mobile` — Expo/React Native app
- `packages/shared` — Zod schemas + TS types shared between backend and mobile (must be built before it's usable — see below)

There is no `apps/web` yet — only backend and mobile exist.

## Commands

Run from repo root unless noted.

```bash
npm install                 # installs all workspaces; postinstall auto-builds packages/shared
npm run backend:dev         # nest start --watch, listens on http://localhost:3000
npm run mobile:start        # expo start
npm run shared:build        # rebuild packages/shared/dist after editing shared types
```

Backend-only (run from `apps/backend`, or `--workspace=@orbit/backend`):
```bash
npm run lint                # eslint src/**/*.ts
npm run typecheck           # tsc --noEmit
npm run build                # nest build
npx prisma migrate dev --name <name>   # after editing prisma/schema.prisma
npx prisma generate
```

Mobile-only (run from `apps/mobile`):
```bash
npm run typecheck
npx expo prebuild && npx expo run:android   # needed once: maplibre is a native module, won't run in plain Expo Go
```

There are no test scripts in any workspace yet (no `test` script defined in any `package.json`).

**`packages/shared` output (`dist/`) is gitignored and must be rebuilt any time its source changes** — the root `postinstall` handles a fresh `npm install`, but mid-session edits to `packages/shared/src/*` need a manual `npm run shared:build` before backend/mobile will see the change (no live-rebuild watch wired into `backend:dev`/`mobile:start`).

### Local Postgres

No Docker — the backend expects a locally-installed Postgres at the `DATABASE_URL` in `.env` (copy from `.env.example`, default `postgresql://orbit:orbit@localhost:5432/orbit`). See README.md for full one-time setup per OS. On WSL2, check `pg_lsclusters` first — cluster/port conflicts are common.

## Architecture

### Data flow: how a location ping moves through the system

1. **Mobile capture** (`apps/mobile/src/location/backgroundLocationTask.ts`): `expo-location` + `expo-task-manager` run an OS-level background watcher (20s / 15m interval baseline). On top of that, the task callback applies an app-layer throttle — if the device is stationary (speed < 0.5 m/s), it only posts once per 5 minutes — because `expo-location` doesn't support changing the OS-level interval on the fly.
2. **POST `/locations`** (`apps/backend/src/locations/locations.controller.ts` → `locations.service.ts`): JWT-guarded, Zod-validated. Persists a `LocationPing` row (every ping is kept, not just latest — supports future history features without a schema change) and then broadcasts the update to **every circle the user belongs to** (a ping is "my location," not scoped to one circle).
3. **Realtime fan-out** (`apps/backend/src/realtime/realtime.service.ts`): an in-process RxJS `Subject` of `{ circleId, event }` broadcasts. `GET /circles/:circleId/locations/events` (`locations.controller.ts`, `CircleLocationsController.streamEvents`) is a Nest `@Sse()` endpoint, guarded by the same `JwtAuthGuard` as the REST routes, that asserts circle membership then filters the subject down to that circle's events. `LocationsService.create()` calls `broadcastLocationUpdate()` to push onto the subject for every circle the poster belongs to.
4. **Mobile consumption** (`apps/mobile/src/screens/MapScreen.tsx`): seeds state via `GET /circles/:id/locations/latest` (one row per member, most recent ping) on mount, then applies live deltas via `subscribeToCircleEvents()` (`apps/mobile/src/api/sse.ts`, using `react-native-sse` — plain browser `EventSource` can't set the `Authorization` header, which is why this library is used instead). REST for the cold-start snapshot, SSE for live updates — no polling.

### Backend module structure (NestJS)

Standard Nest module-per-domain layout under `apps/backend/src/`: `auth/`, `circles/`, `locations/`, `realtime/`, `prisma/`, `common/`. Notable non-obvious pieces:

- **Two separate `JwtService` instances** (`common/token.module.ts`): `ACCESS_JWT_SERVICE` (15m expiry) and `REFRESH_JWT_SERVICE` (30d expiry), injected by token via `@Inject`, used by `AuthService` to sign both. Verification (REST and SSE alike) goes through the shared passport `JwtStrategy`/`JwtAuthGuard`, not this module.
- **Refresh tokens are stored server-side** (`RefreshToken` Prisma model) as a SHA-256 hash keyed by JWT `jti`, so a refresh token can be revoked/rotated — every `refresh()` call revokes the old row and issues a new pair.
- **`CirclesService.assertMembership()`** is the shared authorization check reused by the locations REST endpoint, the `/latest` snapshot route, and the SSE `streamEvents` handler — any new circle-scoped feature should reuse it rather than re-deriving membership.
- **Zod validation**: request DTOs are defined once in `packages/shared` (e.g. `createLocationPingDtoSchema`) and enforced backend-side via `ZodValidationPipe` (`common/zod-validation.pipe.ts`), and reused as TS types on the mobile side — the shared package is the single source of truth for the wire format.
- **`ConfigModule`'s `envFilePath` is `"../../.env"`**, relative to `process.cwd()` — this only resolves correctly because npm workspaces sets cwd to `apps/backend` when running `npm run backend:dev` from the repo root.

### Prisma schema (`apps/backend/prisma/schema.prisma`)

Plain Postgres, no PostGIS yet (deliberately deferred to Phase 2 when geofencing needs real "point in radius" queries). Core models: `User`, `RefreshToken`, `Circle`, `CircleMember` (composite PK `[circleId, userId]`, role `owner`/`member`), `LocationPing` (append-only log, indexed on `[userId, recordedAt desc]`).

### Mobile structure (`apps/mobile/src/`)

- `api/` — `client.ts` (fetch wrapper with auth header injection), `endpoints.ts` (typed REST calls using `@orbit/shared` DTOs), `sse.ts` (`react-native-sse` client, sends the access token as an `Authorization` header — plain `EventSource` can't do this), `tokenStore.ts` (token persistence).
- `auth/AuthContext.tsx`, `circle/CircleContext.tsx` — React context providers gating navigation.
- `location/backgroundLocationTask.ts` — see data-flow section above.
- `navigation/RootNavigator.tsx` — React Navigation stack: Login/Register → CircleSetup → Map.

### Maps

MapLibre (`@maplibre/maplibre-react-native`) + OpenFreeMap vector tiles — chosen specifically to avoid any Mapbox/Google account, API key, or credit card requirement. This is a native module, so the mobile app cannot run in plain Expo Go; it needs a custom dev client (`expo prebuild` + `expo run:android`/`run:ios`, or an EAS build).

## Known simplifications (intentional, documented in README)

- No Docker, no PostGIS, no Redis in Phase 1. Redis is planned for Phase 2 (BullMQ geofence jobs); PostGIS for Phase 2 geofencing queries.
- CORS is app-wide `origin: "*"` (`main.ts`), which also covers the SSE route — acceptable for local/trusted-circle deployment, not for wider exposure.
- The SSE stream is authenticated once at connection time (via `JwtAuthGuard`) and then stays open regardless of the access token's 15m expiry — same behavior the old socket gateway had. Not a concern for a small trusted circle, but not proactive revocation either.

## WSL2 / cross-platform gotchas

README.md's "Gotchas hit in practice" section documents several already-solved issues worth checking before re-debugging: WSL2 LAN networking requires a Windows-side `netsh portproxy` (WSL-internal IP changes on reboot, breaking it), Android blocks cleartext HTTP by default (`usesCleartextTraffic` in `app.json`), Android 14+ needs `FOREGROUND_SERVICE_LOCATION` permission explicitly, `app.json` needs `splash.backgroundColor` even with no splash image, and Metro's `resolver.disableHierarchicalLookup` must stay unset for nested native-module resolution to work in this monorepo.
