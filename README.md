# Orbit

A self-hosted, privacy-respecting Life360-style location sharing app for a small circle. See `apps/` for the backend and mobile app, and `packages/shared` for the types shared between them. The full architecture and phased roadmap live in the plan this repo was built from (Phase 1 = auth, circles, live map).

Maps use [MapLibre](https://maplibre.org/) + [OpenFreeMap](https://openfreemap.org) — free public vector tiles, no account, no API key, no credit card, anywhere in this project.

No Docker required — everything runs directly with Node/npm and a locally-installed Postgres.

## Install Postgres locally (one-time)

**macOS (Homebrew):**
```bash
brew install postgresql@16
brew services start postgresql@16
createdb orbit
psql orbit -c "CREATE ROLE orbit WITH LOGIN PASSWORD 'orbit' SUPERUSER;"
```

**Ubuntu/Debian (including WSL):**
```bash
sudo apt update && sudo apt install -y postgresql postgresql-contrib
sudo pg_ctlcluster <version> main start   # e.g. `sudo pg_ctlcluster 12 main start`
sudo -u postgres psql -c "CREATE ROLE orbit WITH LOGIN PASSWORD 'orbit' SUPERUSER;"
sudo -u postgres createdb orbit -O orbit
```
If Postgres was already installed on your machine before this project, run `pg_lsclusters` first — it may already be running on a non-default port (e.g. 5433 instead of 5432) if another cluster is occupying 5432. Use whatever port `pg_lsclusters` shows in the `DATABASE_URL` below and in every command in this doc (add `-p <port>` to the `psql`/`createdb` commands above if needed).

**Windows:**
1. Download and run the installer from https://www.postgresql.org/download/windows/ (set a password for the `postgres` superuser when prompted).
2. Open `psql` (Start Menu → PostgreSQL → SQL Shell) and run:
   ```sql
   CREATE DATABASE orbit;
   CREATE ROLE orbit WITH LOGIN PASSWORD 'orbit' SUPERUSER;
   ```

All three give you the same connection string used below: `postgresql://orbit:orbit@localhost:5432/orbit`.

## Email (forgot/reset password)

"Forgot password" emails a 6-digit one-time code (self-generated and verified entirely by our own backend — no third-party auth/identity provider involved) via SMTP. The backend needs real `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM` values in `.env` to even start, since `MailService` validates them eagerly at boot. Any SMTP relay works — a free-tier transactional provider (Brevo, Mailgun, SES, etc.) or your own mail server; for local testing something like [Ethereal](https://ethereal.email) (throwaway inbox, no real delivery) also works.

## Push notifications (Firebase / google-services.json)

The mobile app registers for push notifications on launch (`registerForPushNotifications`), and `apps/mobile/app.json` points `android.googleServicesFile` at `./google-services.json` — Expo's Android build (both local `expo prebuild`/`run:android` and EAS cloud builds) needs this file to exist or the build fails. It's gitignored (it's per-project credentials, not something to commit), so every fresh clone needs to add it back:

1. Create a Firebase project at https://console.firebase.google.com (free).
2. Add an Android app to it with package name `com.orbit.app` (must match `apps/mobile/app.json`'s `android.package`).
3. Download the generated `google-services.json` and place it at `apps/mobile/google-services.json`.
4. For local builds (`expo prebuild` / `run:android`) that's the only step needed. For **EAS cloud builds**, the file is also gitignored from EAS's project archive, so upload it as a credential instead: `cd apps/mobile && eas credentials` → Android → push notifications → let EAS generate/manage the FCM service account, or follow the prompts to upload one from the same Firebase project.

**This is a one-time setup, not a per-run step.** Once `apps/mobile/google-services.json` exists locally, every `mobile:start`/`prebuild`/`run:android` just reads it — no need to revisit Firebase Console. Once `eas credentials` has uploaded the FCM credential to your Expo project, every future `eas build` reuses it automatically too. The only time you'd redo the Firebase Console steps is if the local file is lost (e.g. a fresh clone on a new machine — it's gitignored so it never travels with `git clone`) or the Android package name changes. **Keep a personal backup of `google-services.json`** (password manager, private note, etc.) so a fresh clone is just "paste the file back in" rather than "create a new Firebase app."

## First-time setup

1. `cp .env.example .env` and fill in the two JWT secrets (random strings, e.g. `openssl rand -hex 32`) and the `SMTP_*` values (see below — these aren't optional, the backend won't start without them).
2. `npm install` at the repo root (installs all workspaces).
3. Create the initial database schema (only needed once, and again any time you change `apps/backend/prisma/schema.prisma`):
   ```
   cd apps/backend
   DATABASE_URL=postgresql://orbit:orbit@localhost:5432/orbit npx prisma migrate dev --name init
   ```
   This generates `apps/backend/prisma/migrations/`, which should be committed to git.
4. Run the backend: `npm run backend:dev` (from repo root). Listens on `http://localhost:3000`.
5. Add `apps/mobile/google-services.json` (see "Push notifications" above) — required before the next step, or `expo prebuild`/`run:android` will fail looking for it.
6. Run the mobile app: `npm run mobile:start` — set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env`.
   Note: because the app uses `@maplibre/maplibre-react-native` (a native module, not available in the plain Expo Go app), you need a custom dev client — run `npx expo prebuild` then `npx expo run:ios` / `npx expo run:android` once, or build one with `eas build --profile preview`.

## Running on your Android phone (first real device test)

This is the easiest path to see the app running on real hardware: no Android
Studio needed, EAS builds the APK in the cloud. No Mapbox/Google account or
credit card needed anywhere in this flow.

**1. Get the backend reachable on your phone's WiFi**

1. Install Postgres locally and create the database (see above), if you haven't already.
2. `cp .env.example .env`, fill in the two JWT secrets (e.g. `openssl rand -hex 32`, run twice) and the `SMTP_*` values (see "Email" above).
3. `npm install` at the repo root.
4. One-time schema setup: `cd apps/backend && DATABASE_URL=postgresql://orbit:orbit@localhost:5432/orbit npx prisma migrate dev --name init`
5. Add `apps/mobile/google-services.json` (see "Push notifications" above) — the EAS build below will fail without it.
6. Start the backend: from the repo root, `npm run backend:dev`.
7. Find your computer's LAN IP (not `localhost` — your phone is a separate device):
   - Mac: `ipconfig getifaddr en0`
   - Windows: `ipconfig` → "IPv4 Address" under your WiFi adapter
   - Linux: `hostname -I`
8. On your phone's browser (same WiFi network), visit `http://<that-IP>:3000/auth/me`. You should see `{"message":"Unauthorized","statusCode":401}` — that confirms the phone can reach it. If it times out, your computer's firewall is likely blocking inbound connections on port 3000 — allow it.

**2. Point the mobile app at your backend**

Create `apps/mobile/.env`:
```
EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:3000
```
That's it — no map token needed. (If you ever want to swap in a different tile source, set `EXPO_PUBLIC_MAP_STYLE_URL` here too.)

**3. Build and install via EAS (cloud build, no Android Studio required)**

1. `npm install -g eas-cli` (or prefix each command with `npx` instead of installing globally).
2. `eas login` — free signup at https://expo.dev if you don't have an account.
3. **Important:** `apps/mobile/.env` is gitignored, so EAS Build's upload never includes it — a build without the next step will silently fall back to `http://localhost:3000` (useless on a real phone). Register the var with EAS directly instead:
   ```
   cd apps/mobile
   eas env:create --scope project --name EXPO_PUBLIC_API_URL --value "http://<your-LAN-IP>:3000" --environment preview --visibility plaintext --non-interactive
   ```
4. `google-services.json` is also gitignored, so EAS's project archive won't include it either — if you haven't already run `eas credentials` (Android → push notifications) per the "Push notifications" section above, do that now or the build step below will fail.
5. `eas build --platform android --profile preview`
   - First run may ask a couple of one-time setup questions (e.g. generating a keystore) — accept the defaults.
   - Takes ~10-15 minutes (plus possible queue time on the free tier). When done you get a link and QR code. Track progress at https://expo.dev under your account's project builds.
6. On your phone, open the link or scan the QR code, download, and install the APK (Android will warn about "install from unknown sources" the first time for a non-Play-Store app — allow it).
7. Open the app: register, create a circle, grant location permission (choose "Allow all the time" so background sharing works), and you should see yourself appear on the map.

Once Android works, the iPhone build (same steps but `--platform ios`, which needs a paid Apple Developer account for a real-device build) reuses the same backend — still no map account needed.

## Known simplifications (documented deviations from the original plan)

- **Redis was dropped from Phase 1.** Nothing in the current code needs pub/sub or a job queue with a single backend instance. It'll come back in Phase 2 for background geofence-evaluation jobs (BullMQ).
- **Maps use MapLibre + OpenFreeMap instead of Mapbox/Google**, switched after the original plan, specifically to avoid any account/API-key/credit-card requirement. Slightly less polished search/labels than Mapbox or Google, but fully free and account-less.
- **No Docker.** The plan originally called for a portable Docker Compose app; dropped in favor of running directly against a locally-installed Postgres, per request, to keep local setup as simple as possible.
- **No PostGIS.** Dropped alongside Docker for the same reason — installing the PostGIS extension package varies by OS/Postgres version and is a real source of setup friction, and nothing in Phase 1 uses it yet. Comes back in Phase 2 as a small schema addition when geofencing needs real "point in radius" queries.

## Gotchas hit in practice (and already fixed/documented here)

- **Missing `SMTP_*` env vars crash the whole backend at startup, not just the forgot-password endpoint.** `MailService`'s constructor calls `ConfigService.getOrThrow` for each `SMTP_*` var, and Nest instantiates every provider (including ones no request has touched yet) when the app boots. If you don't need real email delivery yet, point `SMTP_HOST` at a throwaway service like Ethereal rather than leaving it unset.
- **`packages/shared` needs a build step, and its output (`dist/`) is gitignored.** A fresh checkout (or an EAS Build server, which archives the project respecting `.gitignore`) won't have it unless something rebuilds it. Fixed with a root-level `postinstall` script (`npm run build --workspace=@orbit/shared`) that runs automatically after every `npm install`, anywhere.
- **`apps/mobile/.env` is also gitignored**, so EAS Build's cloud archive never includes it either — a build kicked off without registering `EXPO_PUBLIC_API_URL` via `eas env:create` first will silently fall back to `http://localhost:3000` in the built APK. See the EAS section above.
- **Running the backend under WSL2**: your phone needs your Windows machine's LAN IP (from Windows' own `ipconfig`), not the WSL-internal IP (from `hostname -I` inside WSL) — they're different networks. WSL2 only auto-forwards `localhost` traffic into the WSL VM, not traffic arriving on the LAN-facing adapter, so exposing a WSL-hosted server to your phone over WiFi needs a manual Windows-side port proxy + firewall rule (as Administrator PowerShell):
  ```powershell
  netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=<WSL-internal-IP-from-hostname--I>
  New-NetFirewallRule -DisplayName "Orbit Backend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
  ```
  The WSL-internal IP can change on reboot/WSL restart, which breaks the portproxy rule (needs re-running with the new IP). For a permanent fix, look into WSL's "mirrored" networking mode (`.wslconfig`), which avoids this whole class of problem.
- **Debian/Ubuntu `createdb`/`psql` wrapper scripts can target the wrong Postgres version** if multiple cluster versions are registered (e.g. a broken leftover cluster on the default port). If you hit `Error: PostgreSQL version X is not installed` despite passing `-p <port>`, call the version-specific binary directly instead, e.g. `/usr/lib/postgresql/<version>/bin/createdb -p <port> ...`, bypassing the wrapper's version auto-detection.
- **`apps/mobile/metro.config.js` originally set `resolver.disableHierarchicalLookup = true`.** That's too aggressive for a monorepo: it disables Metro's normal upward node_modules search entirely (needed to find a dependency's own *nested* node_modules, e.g. `@maplibre/maplibre-react-native/node_modules/@turf/helpers`, which npm doesn't hoist to the workspace root). This broke EAS builds with "Unable to resolve module @turf/helpers". Fixed by removing that line — the explicit extra `nodeModulesPaths` entries are enough on their own to also find hoisted workspace packages like `@fetchlocation/shared`, without breaking normal nested resolution.
- **`app.json` needs a `splash.backgroundColor`, even with no splash image.** Expo's Android prebuild template always generates a `splashscreen.xml` referencing `@color/splashscreen_background`, and without a `splash` config in `app.json` that color is never defined, failing the build at the `processReleaseResources` (AAPT2 linking) step with "resource color/splashscreen_background not found". A plain `{"backgroundColor": "#ffffff"}` is enough — no image file required.
- **Android blocks plain `http://` network requests by default** (cleartext traffic disallowed since API 28), so talking to a local backend like `http://<LAN-IP>:3000` fails silently at the OS level -- the app just shows a generic network error, not an HTTP error, since the request never leaves the device. Fixed by adding the `expo-build-properties` config plugin with `android: { usesCleartextTraffic: true }` in `app.json`. Fine for local dev against your own LAN backend; a production deployment behind HTTPS wouldn't need this.
- **The background location watcher's first callback can be delayed well past its configured `timeInterval`** (Android battery optimizations, Doze mode, etc.), so a member's own location could stay "No location yet" for a long time even with everything else working correctly. `startBackgroundLocationTracking` now also grabs and posts one immediate one-shot fix (`Location.getCurrentPositionAsync`) before registering the background watcher, so the map has *something* right away. It also now returns a specific reason on failure instead of a bare boolean, surfaced via an `Alert` in `MapScreen` — useful since a standalone release APK has no attached console to check otherwise.
- **Android 14 (API 34) requires a foreground-service-type-specific permission, not just the generic one.** `FOREGROUND_SERVICE` alone isn't enough for `expo-location`'s background location service on API 34+ devices — you also need `FOREGROUND_SERVICE_LOCATION`, or `startLocationUpdatesAsync` throws "Couldn't start the foreground service. Foreground service permissions were not found in the manifest." Both are now declared in `app.json`'s `android.permissions`. (This is exactly the kind of thing the `Alert`-based diagnostic above was added to catch, since it only surfaces at runtime on real API 34 hardware.)
