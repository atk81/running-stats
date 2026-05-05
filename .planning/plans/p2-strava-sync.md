# Plan: Strava Activity Sync (Phase 2)

**Spec**: `.planning/specs/p2-strava-sync.md`
**Design**: `.planning/design/screens/p2-strava-sync/design.md`
**Epic**: Phase 2 — Onboarding + Sync
**Created**: 2026-05-05
**Status**: approved (Gate 2 passed; Vitest deferred per user direction 2026-05-05 — verification = typecheck + lint + manual smoke for this PR)
**Branch**: `feat/p2-strava-sync`
**Stack**: Next.js 16 App Router + TypeScript + node-appwrite@24 (TablesDB) + Vitest (added in Wave 0)

---

## Architecture

### Data flow

```
[Onboarding Step 3]
    ↓ click "Open dashboard"
[useFinalizeOnboarding] → PATCH /api/users/onboarding (existing)
    ↓ on success
[useSyncStrava (new)] → POST /api/strava/sync
    ↓
[route handler] → [getValidAccessToken] → decrypt → check expiry → refresh if needed → updateRow
    ↓
[lib/strava/api.ts listAthleteActivities] → paginated GET /athlete/activities?after=…&per_page=200
    ↓ filter Run/TrailRun/VirtualRun → map to row payload
[tablesDB.upsertRow per activity, rowId = a{stravaActivityId}]
    ↓
[updateRow user: lastSyncAt, syncInProgress=false]
    ↓ response { ok, synced, skipped, lastSyncAt }
[OnboardingClient] → router.push('/dashboard')
```

### Layered structure

| Layer | Module | Responsibility |
|---|---|---|
| HTTP | `app/api/strava/sync/route.ts` | Auth gate, lock acquire/release, response shape |
| Domain | `lib/strava/sync.ts` | Map SummaryActivity → row payload, batch upsert (extracted for testability) |
| Token | `lib/strava/tokenRefresh.ts` | Decrypt, expiry check, refresh, write-back |
| Strava client | `lib/strava/api.ts` | Typed `fetch` wrapper, pagination, error mapping |
| Schema | `appwrite.json` + `lib/appwrite/collections.ts` | `users.syncInProgress` attribute |
| UI | `components/onboarding/OnboardingClient.tsx` | Inline panel state machine (`syncing`/`success`/`error`) |
| UI helper | `components/onboarding/SyncStatusInline.tsx` (new) | Pure render of 3 states |
| UI hook | `lib/hooks/useSyncStrava.ts` (new) | TanStack-Query mutation wrapping POST |

### Components Table

| Component | Type | Purpose |
|---|---|---|
| `lib/strava/api.ts` | Service | Fetch wrapper, paginated `listAthleteActivities`, typed errors |
| `lib/strava/tokenRefresh.ts` | Service | `getValidAccessToken(userId)` — decrypt, refresh-if-stale, write back |
| `lib/strava/sync.ts` | Domain | Pure `mapSummaryToRow`, filter, count helpers — testable without HTTP |
| `lib/strava/types.ts` | Types (extend) | Add `SummaryActivity`, `StravaError*` types |
| `app/api/strava/sync/route.ts` | Route | POST handler — auth, lock, fetch, write, unlock |
| `lib/hooks/useSyncStrava.ts` | Hook | TanStack mutation for `POST /api/strava/sync` |
| `components/onboarding/SyncStatusInline.tsx` | Component | Pure 3-state panel render (loading/success/error) |
| `components/onboarding/OnboardingClient.tsx` | Edit | Wire `useSyncStrava` after finalize, conditional render of `<SyncStatusInline>` |
| `appwrite.json` | Schema | Add `users.syncInProgress` boolean |
| `lib/appwrite/collections.ts` | Constants | Add `syncInProgress` to `ATTRS.users` |
| `vitest.config.ts` | Config | Vitest setup (Wave 0) |
| `package.json` | Config | Add `test` script + Vitest devDeps |

### File Locations

| File | Location | New / Edit |
|---|---|---|
| `vitest.config.ts` | repo root | new |
| `src/test/setup.ts` | `src/test/` | new |
| `package.json` | repo root | edit (scripts + devDeps) |
| `appwrite.json` | repo root | edit (add `syncInProgress` attr) |
| `src/lib/appwrite/collections.ts` | `src/lib/appwrite/` | edit |
| `src/lib/strava/types.ts` | `src/lib/strava/` | edit (extend) |
| `src/lib/strava/api.ts` | `src/lib/strava/` | new |
| `src/lib/strava/tokenRefresh.ts` | `src/lib/strava/` | new |
| `src/lib/strava/sync.ts` | `src/lib/strava/` | new |
| `src/app/api/strava/sync/route.ts` | `src/app/api/strava/sync/` | new |
| `src/lib/hooks/useSyncStrava.ts` | `src/lib/hooks/` | new |
| `src/components/onboarding/SyncStatusInline.tsx` | `src/components/onboarding/` | new |
| `src/components/onboarding/OnboardingClient.tsx` | `src/components/onboarding/` | edit |
| `src/lib/strava/__tests__/api.test.ts` | colocated | new |
| `src/lib/strava/__tests__/tokenRefresh.test.ts` | colocated | new |
| `src/lib/strava/__tests__/sync.test.ts` | colocated | new |

### Files to Change (existing)

| File | What Changes | Why |
|---|---|---|
| `appwrite.json` | Add `users.syncInProgress` boolean attribute | Sync lock per spec |
| `src/lib/appwrite/collections.ts` | Add `syncInProgress: "syncInProgress"` to `ATTRS.users` | Mirror schema constant |
| `src/lib/strava/types.ts` | Add `SummaryActivity`, `StravaErrorCode`, `StravaAuthError`, `StravaRateLimitError`, `StravaServerError` | Domain types for new client |
| `src/components/onboarding/OnboardingClient.tsx` | Replace direct `router.push('/dashboard')` after finalize with `useSyncStrava` mutation + render `<SyncStatusInline>` while pending | Wire sync into onboarding flow |
| `package.json` | Add `test` script, devDeps for Vitest | Enable test runner |

---

## Wave Decomposition (per CLAUDE.md GSD v5)

Each wave is a logical unit. Waves run sequentially; tasks within a wave can run in parallel.

### Wave 0 — Schema only (Vitest deferred per user)

| WU | Task | Files | Verification |
|---|---|---|---|
| WU-0 | Apply `users.syncInProgress` attribute to live Appwrite via `appwrite databases create-boolean-attribute` (per LESSONS — never `push`). Update `appwrite.json` to mirror live schema. Update `src/lib/appwrite/collections.ts` `ATTRS.users` to include the new key. | `appwrite.json`, `src/lib/appwrite/collections.ts` | manual: read users row via Appwrite console → confirm column exists with default `false` |

**Vitest deferred** — separate future PR will add test infra + retroactive coverage of `lib/strava/*`. This PR's verification = typecheck (`tsc --noEmit` via `npm run build`) + lint (`npm run lint`) + manual smoke.

### Wave 1 — Strava client + token refresh + types (after Wave 0)

| WU | Task | Files |
|---|---|---|
| WU-1a | Extend `lib/strava/types.ts` with `SummaryActivity` interface (mapping per spec data-model section), `StravaErrorCode` union, `StravaAuthError`/`StravaRateLimitError`/`StravaServerError` error classes (extend `Error`, carry `retryAfter` where relevant). | `src/lib/strava/types.ts` |
| WU-1b | Build `lib/strava/api.ts`: `listAthleteActivities({ accessToken, after, perPage })`. `fetch` with bearer auth + `AbortSignal.timeout(10_000)`. Paginate up to 5 pages. Map status → typed errors (401→Auth, 429→RateLimit w/ Retry-After header, 5xx→Server). Return concatenated `SummaryActivity[]`. | `src/lib/strava/api.ts` |
| WU-1c | Build `lib/strava/tokenRefresh.ts`: `getValidAccessToken(userId)`. Read user row → decrypt `stravaAccessToken`/`stravaRefreshToken` → if `now + 60s ≥ stravaTokenExpiresAt` → POST `https://www.strava.com/oauth/token` with `grant_type=refresh_token` → encrypt + `tablesDB.updateRow` (NOT upsert per LESSONS). Return plaintext access token. | `src/lib/strava/tokenRefresh.ts` |

**Why parallel:** distinct files; types compile-only; api.ts and tokenRefresh.ts share types but no runtime coupling.

### Wave 2 — Sync domain logic (depends on Wave 1)

| WU | Task | Files |
|---|---|---|
| WU-2 | Build `lib/strava/sync.ts`. Pure functions: `mapSummaryToRow(activity, userId)`, `filterRunActivities(activities)`, `computeYtdAfterTimestamp(now)`, `clampPolyline(s)`, `safePace(speedMps)`. Plus `handleSync(userId)` extracted from route per R5. No HTTP, no Appwrite SDK at module top level — only inside `handleSync`. |  `src/lib/strava/sync.ts` |

### Wave 3 — Sync route handler (depends on Wave 1 + 2)

| WU | Task | Files |
|---|---|---|
| WU-3 | Build `app/api/strava/sync/route.ts`. POST. Thin wrapper: `requireUser` → call `handleSync(userId)` from `lib/strava/sync.ts` → JSON-shape response or error. | `src/app/api/strava/sync/route.ts` |

### Wave 4 — Frontend wiring (after Wave 3)

| WU | Task | Files |
|---|---|---|
| WU-4a | Build `lib/hooks/useSyncStrava.ts`. TanStack-Query `useMutation`. Body: `fetch('/api/strava/sync', { method: 'POST' })` with backend-error-message extraction per `.claude/rules/frontend-react/FRONTEND.md`. Returns `{ mutate, mutateAsync, isPending, isError, error, data }`. | `src/lib/hooks/useSyncStrava.ts` |
| WU-4b | Build `components/onboarding/SyncStatusInline.tsx`. Props: `state: 'loading'\|'success'\|'error'`, `errorCode?: string`, `syncedCount?: number`, `elapsedSec?: number`, `onRetry?: ()=>void`, `onSkip?: ()=>void`. Pure render — three branches per design doc. Inline `<style>` (Next 16 supports it via `dangerouslySetInnerHTML` on a `<style>` tag for component-scoped keyframes) for `rs-pulse-dot-ignite` keyframe override (NOT in globals.css per design doc). Uses existing `<Button>` + inline SVGs. | `src/components/onboarding/SyncStatusInline.tsx` |

### Wave 5 — Onboarding wire-up (depends on Wave 4)

| WU | Task | Files | Verification |
|---|---|---|---|
| WU-5 | Edit `components/onboarding/OnboardingClient.tsx`. Add `syncing` state; replace `onFinish` body with: `await finalize.mutateAsync(autoShare)` → `setSyncing('loading')` + start elapsed counter → `await syncStrava.mutateAsync()` → `setSyncing('success')` + `setSyncedCount(n)` → 600ms timer → `router.push('/dashboard')`. On error → `setSyncing('error')` + `setErrorCode(message)`. Render `<SyncStatusInline>` while `syncing != null`, swap out the existing footer + `<AutoSharePrefs>` body during sync. | `src/components/onboarding/OnboardingClient.tsx` | manual smoke: full onboarding → verify panel + redirect; offline → verify error + Skip routes anyway |

### Wave 6 — plan.md update + simplify + lessons + PR

Stage 4-7 of `/next-task`. Not coding tasks per se — pipeline drives them.

---

## Parallel vs Sequential

| Wave | Parallel WUs within wave | Depends on |
|---|---|---|
| 0 | WU-0a, WU-0b | — |
| 1 | WU-1a, WU-1b, WU-1c | Wave 0 |
| 2 | WU-2 | Wave 1 (types) |
| 3 | WU-3 | Wave 1 (api, tokenRefresh) + Wave 2 (sync) |
| 4 | WU-4a, WU-4b | Wave 3 (route exists for hook to call) |
| 5 | WU-5 | Wave 4 |

Waves are linear; intra-wave parallelism = ~3 max. Single-tab serial execution is fine for this PR — opening 3 Claude Code tabs for a 1-day feature has more overhead than benefit. Run sequentially.

---

## Testing Plan

| Layer | Tests | Spec edge case mapped |
|---|---|---|
| `lib/strava/api.ts` | 6 unit tests: single-page happy, multi-page concat, 401→AuthError, 429→RateLimitError(retryAfter), 5xx→ServerError, abort timeout | Edge case 4, 6 |
| `lib/strava/tokenRefresh.ts` | 3 unit tests: still-valid, expired+refresh+writeback, refresh-fail rethrow | Edge case 3 |
| `lib/strava/sync.ts` | 6 unit tests: map happy, polyline truncate (warn-log spy), zero-speed→null pace, filter Run families keep, Hike/Walk drop, YTD timestamp UTC Jan 1 | Edge case 1, 7, 8 |
| `app/api/strava/sync/route.ts` | 7 integration tests: happy, lock contention 409, stale lock steal, 401, 503, 500, idempotency | Edge case 2, 5, 9, 10 |
| `lib/hooks/useSyncStrava.ts` | 3 component tests (happy-dom): success, 503 message, 409 message | All UI paths |
| `components/onboarding/SyncStatusInline.tsx` | 3 component tests (happy-dom): loading render, success render w/ count, error code → caption mapping | All visual states |
| Manual smoke | 1: full onboarding → dashboard. 2: offline → Skip. 3: re-sync from rebuilt panel | UI path total |

Coverage target: ≥ 80% lines on `lib/strava/*` and `app/api/strava/sync/*`.

---

## Risks (carried from spec + new)

- **R1**: Strava `pr_count` on SummaryActivity stale → Phase 4 must re-derive. Captured.
- **R2**: 60s stale-lock TTL is a guess → review after smoke. Captured.
- **R3**: Per-activity round-trips (no bulk upsert API in node-appwrite@24) → use `Promise.all` w/ concurrency cap 10. Captured.
- **R4 (new)**: Adding Vitest may surface Next.js 16 / TS strict-mode interop issues (e.g. `transform` of `.tsx` files in test env). If WU-0a runs > 30 min, downgrade to native `node:test` runner — no deps, no config, just `*.test.mjs` files alongside source. Document fallback in PR description.
- **R5 (new)**: `next/server` `NextRequest` is awkward to construct in tests. Strategy: extract route logic into a pure `handleSync(userId)` in `lib/strava/sync.ts` and have `route.ts` thin-wrap it (auth + JSON shape). Test the pure handler. Avoids fighting Next test interop.

---

## Gate 2 Checklist

**Architecture:**
- [x] Layered structure matches existing patterns (route → lib → appwrite admin client)
- [x] Each layer calls only the layer below (route → lib/strava → tablesDB; lib never reaches into Next runtime)
- [x] File locations match existing conventions (`src/lib/strava/*`, `src/app/api/*/route.ts`, `src/components/onboarding/*`)

**Task Breakdown:**
- [x] All files to change listed (5 edits)
- [x] All new files listed with locations (12 new)
- [x] Each task ≤ 3 files / one commit
- [x] Wave dependencies explicit
- [x] Parallel-vs-sequential called out

**Testing:**
- [x] Data layer tests planned (api, tokenRefresh)
- [x] Business logic tests planned (sync.ts mappers)
- [x] API/integration tests planned (route handler)
- [x] UI tests planned (hook + SyncStatusInline)
- [x] All 10 edge cases from spec mapped to tests

**Quality:**
- [x] Risks called out with fallbacks (R4 vitest interop → node:test, R5 NextRequest → pure handler)
- [x] LESSONS.md applied: TablesDB not Databases, updateRow not upsertRow for partials, lazy env reads, Tailwind utilities for layout, no react-hooks/set-state-in-effect violations, OAuth-callback-style row-existence probe pattern reused

Gate 2: **PASS**.
