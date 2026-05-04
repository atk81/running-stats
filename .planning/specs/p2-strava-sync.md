# Spec: Strava Activity Sync (Phase 2)

**Created**: 2026-05-05
**Status**: draft
**Author**: team
**Epic**: Phase 2 — Onboarding + Sync
**Branch**: `feat/p2-strava-sync`

---

## Problem

After OAuth + onboarding, the app has user identity, goals, and avatar — but no activity data. Without activities, the dashboard, milestone feed, and goal-progress UI all render empty. We need a sync flow that pulls a user's runs from Strava on demand (initial onboarding finalize + manual re-sync from dashboard) and stores them in the `activities` collection so downstream features can read them.

## Goal

After onboarding finalize completes, the user's last 12 months of `Run` / `TrailRun` / `VirtualRun` activities are persisted as Appwrite rows with summary fields populated, ready for Phase 3 (dashboard) and Phase 4 (milestone detection) to consume. A user with ~150 activities should complete sync in under 10 seconds wall-clock and use ≤ 2 Strava API reads.

Success metrics:
- Sync of a 150-activity year completes in ≤ 10 s wall-clock and ≤ 2 reads against Strava `GET /athlete/activities`.
- All `Run`-family activities for current calendar year visible in `activities` collection with valid `userId`, `stravaActivityId`, `date`, `distanceKm`, `movingTimeSec`.
- `users.lastSyncAt` updated to sync completion timestamp.
- Re-sync (manual button on dashboard) is idempotent: no duplicate rows, no permission errors, no token-refresh races.

## User Stories

- **As a runner who has just finished onboarding**, I want my last year of runs to appear on the dashboard within 10 seconds, so I see immediate value and don't have to wonder if my data is there.
- **As a returning user whose token has expired**, I want a re-sync to "just work" without me having to reconnect Strava, because the app should refresh the token transparently.
- **As a runner who logs a new run on Strava**, I want a manual "Re-sync" button on the dashboard to pull the new activity, because Phase 5 webhooks aren't shipped yet.

## Requirements

### Must-have

1. `lib/strava/api.ts` — typed Strava REST client wrapping `fetch`. Bearer auth via passed-in access token. Exposes:
   - `listAthleteActivities({ accessToken, after, perPage })` — returns `SummaryActivity[]`. Paginates internally up to a hard cap (5 pages = 1000 activities).
   - Standard error mapping: 401 → `StravaAuthError`, 429 → `StravaRateLimitError` (carries `X-RateLimit-Limit` / `X-RateLimit-Usage` headers), 5xx → `StravaServerError`. Caller decides whether to refresh token or surface to user.
   - 10-second `AbortSignal.timeout` per request.
2. `lib/strava/tokenRefresh.ts` — `getValidAccessToken(userId)` helper. Reads encrypted token from user row, decrypts, checks `stravaTokenExpiresAt` against `now + 60s` skew. If still valid → returns plaintext. If expired → calls Strava `POST /oauth/token` with refresh grant, encrypts new tokens, writes them back via `tablesDB.updateRow` (NOT `upsertRow` — see LESSONS), returns new plaintext access token.
3. `app/api/strava/sync/route.ts` — `POST` handler:
   - Auth via `requireUser()`.
   - Acquire `syncInProgress` lock on user row (set `true`; if already `true` AND `lastSyncAt` is within 60 s → return `409 sync_in_progress`; if stale lock > 60 s → steal it).
   - Get valid access token via `getValidAccessToken`.
   - Compute `after` = unix timestamp of Jan 1 of current year (UTC, per `.claude/rules/core/TIMEZONE.md`).
   - Call `listAthleteActivities` with that `after` and `per_page=200`.
   - Filter to `type ∈ {"Run", "TrailRun", "VirtualRun"}`.
   - Map each `SummaryActivity` to an Appwrite row payload: `{ userId, stravaActivityId, title, type, date, distanceMeters, distanceKm, movingTimeSec, elapsedTimeSec, avgSpeedMps, avgPaceSecPerKm, maxSpeedMps, avgHeartrate?, maxHeartrate?, elevationGainM, summaryPolyline, prCount, achievementCount, processed: false }`. `bestEfforts` and `splitsMetric` left null — Phase 4 populates.
   - Upsert each row via `tablesDB.upsertRow` keyed on a deterministic `rowId` derived from `stravaActivityId` (e.g. `a${stravaActivityId}`). Idempotent re-sync.
   - On completion, single `updateRow` on user: `{ lastSyncAt: <ISO now>, syncInProgress: false }`.
   - Response: `{ ok: true, synced: <count>, skipped: <non-run-count>, lastSyncAt: <iso> }`.
   - Errors: token refresh fail → 401 `strava_auth_failed`; rate limit → 503 `strava_rate_limited` (release lock); other → 500 `sync_failed` (release lock).
4. **Schema change to `users` collection**: add optional `syncInProgress` boolean (default `false`). Update `appwrite.json` + apply via `appwrite databases create-boolean-attribute` (per LESSONS — push command unsafe).
5. Sync progress UI in onboarding finalize (step 3 → dashboard transition):
   - When user clicks "Open dashboard" on Step 3, after the existing `PATCH /api/users/onboarding` succeeds, fire `POST /api/strava/sync` AND show an in-place "Pulling your runs from Strava…" panel with a small spinner.
   - On success: route to `/dashboard`.
   - On error: show inline message + "Skip for now" button that routes to `/dashboard` anyway (sync can be retried from dashboard later).
6. **Plan.md drift to flag in PR description**: Phase 2 sync is summary-only over full YTD (not 90 days, not detail-fetch). `bestEfforts`/`splitsMetric` writes move to Phase 4 along with detail-fetch worker.

### Nice-to-have

- Manual "Re-sync Strava" button on dashboard (Phase 3 will own; expose endpoint in Phase 2 only).
- Per-page progress events (e.g. `synced: 50/150` UI hint) — defer; one-shot count is fine for v1.
- Realtime subscription on `users.lastSyncAt` so other tabs see updates — defer to Phase 5.

### Out of scope

- DetailedActivity fetch (`GET /activities/{id}`) — Phase 4.
- `bestEfforts` / `splitsMetric` storage — Phase 4.
- Strava webhook subscription + handler — Phase 5.
- Cron-driven periodic sync — Phase 5 (`strava-periodic-sync` Appwrite Function).
- Personal records derivation — Phase 4.
- Milestone detection on activity insert — Phase 4.
- `lib/hooks/useGoals.ts` and `lib/hooks/useActivities.ts` — separate PR per `CLAUDE.md` "one section, one PR" rule (next `/next-task` after this).

## Data Model

### Existing `activities` collection (no schema change)

Already has all needed attributes per `appwrite.json` lines 300-487. `bestEfforts`/`splitsMetric` are optional `string(4096)` — Phase 2 leaves them null, Phase 4 populates.

Key field mapping from Strava `SummaryActivity` → row:

| Strava field | Row attribute | Notes |
|---|---|---|
| `id` (number) | `stravaActivityId` (string(20)) | `String(id)` |
| `name` | `title` | clamp to 256 chars |
| `type` | `type` | only "Run", "TrailRun", "VirtualRun" stored |
| `start_date` (ISO) | `date` (datetime) | UTC, pass through |
| `distance` (meters) | `distanceMeters` | float |
| `distance / 1000` | `distanceKm` | computed |
| `moving_time` | `movingTimeSec` | int |
| `elapsed_time` | `elapsedTimeSec` | int |
| `average_speed` | `avgSpeedMps` | float |
| `1000 / average_speed` (if > 0) | `avgPaceSecPerKm` | int, computed; null if speed = 0 |
| `max_speed` | `maxSpeedMps` | float |
| `average_heartrate` | `avgHeartrate` | float, optional |
| `max_heartrate` | `maxHeartrate` | float, optional |
| `total_elevation_gain` | `elevationGainM` | float |
| `map.summary_polyline` | `summaryPolyline` | clamp to 4096 chars; truncate w/ warn-log if longer |
| `pr_count` | `prCount` | int |
| `achievement_count` | `achievementCount` | int |
| — | `processed` | always `false` (Phase 4 worker will flip) |
| — | `userId` | from `requireUser()` |

`calories` is NOT on `SummaryActivity` (only `DetailedActivity`) — leave null; Phase 4 populates.

### Schema change: `users.syncInProgress`

```json
{
  "key": "syncInProgress",
  "type": "boolean",
  "required": false,
  "array": false,
  "default": false
}
```

Apply via `appwrite databases create-boolean-attribute --database-id runstats_db --collection-id users --key syncInProgress --required false --default false` (NOT via `appwrite push` — LESSONS).

Update `appwrite.json` to match. Mirror in `src/lib/appwrite/collections.ts` `ATTRS.users`.

## API Changes

### New: `POST /api/strava/sync`

**Auth**: session cookie required (via `requireUser()`).

**Request body**: empty / ignored.

**Response 200**:
```json
{
  "ok": true,
  "synced": 142,
  "skipped": 8,
  "lastSyncAt": "2026-05-05T12:34:56.000Z"
}
```

**Response 401**: `{ "error": "strava_auth_failed" }` — tokens invalid even after refresh; user must re-OAuth.

**Response 409**: `{ "error": "sync_in_progress" }` — concurrent sync detected within 60 s window.

**Response 503**: `{ "error": "strava_rate_limited", "retryAfter": <seconds> }` — Strava 429.

**Response 500**: `{ "error": "sync_failed", "detail": "<message>" }` — anything else.

## UI Changes

### Onboarding final step (Step 3 → Dashboard)

Modification to existing `OnboardingClient.tsx` finalize flow:

Currently:
```
finalize.mutate → onSuccess → router.push("/dashboard")
```

New:
```
finalize.mutate → onSuccess → setSyncing(true) → POST /api/strava/sync
  → on success → router.push("/dashboard")
  → on error → show inline error w/ "Skip for now" → router.push("/dashboard")
```

Visual treatment (per design tokens in `.planning/design/system/tokens.md`):
- Replace step 3's footer button area with a centered status card: small spinner (existing primitive or simple CSS) + headline "Pulling your runs from Strava…" + caption "This usually takes a few seconds."
- On error: error pill (existing `<FieldError />`) + "Skip for now" `<Button variant="ghostLight">`.
- No new screen / route. Reuse `<OnboardingStep />` shell; just swap the inner content while `syncing === true`.

### No new components in `components/`

Sync progress is inline JSX inside `OnboardingClient.tsx`. Spinner is existing primitive (or CSS `@keyframes` already in `globals.css`).

## Edge Cases

1. **First-time user, no activities in current year**: list returns `[]`. We skip all writes, set `lastSyncAt`, return `{ ok: true, synced: 0, skipped: 0 }`. Dashboard handles empty state in Phase 3.
2. **User has > 1000 activities in a year (ultra-runner)**: pagination cap at 5 × 200 = 1000. We hit cap → log warn + truncate. Acceptable — 1000 runs in 5 months is already absurd; if it ever happens we expand cap.
3. **Token expired mid-sync**: shouldn't happen because `getValidAccessToken` runs first; but if Strava returns 401 after we've fetched some pages, refresh once and retry the failing request. If second 401 → return `strava_auth_failed`.
4. **Rate limit 429 hit**: release sync lock, return 503 with `Retry-After` from header. Frontend shows "Strava is busy, try again in X minutes."
5. **Concurrent sync from two tabs / webhook + manual**: the `syncInProgress` flag short-circuits the second caller with 409. 60-second stale-lock window handles crashed routes.
6. **Activity with `summary_polyline` longer than 4096 chars**: truncate to 4096 + log warn. Valid polyline prefixes still render a partial route on the share template.
7. **Activity with `average_speed = 0`** (paused-the-whole-time edge case): `avgPaceSecPerKm = null` (don't divide by zero).
8. **`type` in {"Hike", "Walk", "Workout"}**: filtered out at map-stage, counted into `skipped`.
9. **Re-sync overlapping window**: same `stravaActivityId` already exists. `tablesDB.upsertRow` keyed on derived `rowId` (`a{stravaActivityId}`) idempotently overwrites. The `unique` index on `stravaActivityId` (per `appwrite.json` line 454) also enforces this at DB level.
10. **Strava OAuth scope insufficient** (`activity:read` only, no `activity:read_all`): private activities won't list. Spec accepts this — we already request `activity:read_all` at OAuth time per `oauth.ts:8`.

## Testing Criteria

### Happy path (integration test, mocked Strava)

- Seed user with valid (mock-encrypted) tokens, no activities.
- Mock Strava list endpoint to return 3 SummaryActivity (2 Run, 1 Hike).
- POST `/api/strava/sync` → expect 200, `synced: 2, skipped: 1`.
- Read `activities` collection → 2 rows with correct `userId`, `stravaActivityId`, `processed: false`.
- Read user row → `lastSyncAt` set, `syncInProgress: false`.

### Token refresh path (unit test on `tokenRefresh.ts`)

- Seed user row with `stravaTokenExpiresAt = now - 60`.
- Mock Strava `POST /oauth/token` to return new tokens.
- Call `getValidAccessToken(userId)` → expect new plaintext access token, user row updated with new encrypted tokens + new `expiresAt`.

### Concurrent sync (integration test)

- Seed user row with `syncInProgress: true` and `lastSyncAt: now - 10s`.
- POST `/api/strava/sync` → expect 409 `sync_in_progress`.
- Set `lastSyncAt: now - 120s` (stale lock).
- POST again → lock stolen, sync proceeds.

### Idempotency (integration test)

- Run sync once with 5 activities → 5 rows.
- Run sync again with same 5 activities → still 5 rows (no duplicates), `lastSyncAt` updated.

### Rate limit (unit test on `api.ts`)

- Mock 429 response with `Retry-After: 30` header.
- Call `listAthleteActivities` → expect `StravaRateLimitError` thrown with `retryAfter: 30`.

### UI smoke (manual)

- Complete onboarding → click "Open dashboard" → expect "Pulling your runs from Strava…" panel for 1-5 seconds → land on `/dashboard`.
- Disconnect network mid-finalize → expect inline error + "Skip for now" → click → land on `/dashboard`.

## Dependencies

- **Existing code**: `lib/utils/encryption.ts`, `lib/auth/requireUser.ts`, `lib/appwrite/server.ts` (admin client), `lib/appwrite/collections.ts`, `lib/strava/oauth.ts`, `lib/strava/types.ts`. All present per `find src/lib`.
- **Existing schema**: `activities` collection per `appwrite.json` lines 300-487. No changes.
- **New schema**: `users.syncInProgress` boolean. Applied manually via Appwrite CLI (LESSONS).
- **Env vars**: already-set `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `RUNSTATS_ENCRYPTION_KEY`. No new secrets.
- **No new npm packages.** Uses native `fetch`, existing `node-appwrite@24`.

## Risks & Open Questions

- **R1: Strava `pr_count` on SummaryActivity is sometimes stale.** Phase 4 must not rely on Phase 2's `prCount` for milestone detection — it must read fresh `best_efforts[].pr_rank` from the detail fetch. Captured here; Phase 4 spec will reference.
- **R2: Stale-lock TTL of 60s is a guess.** A slow sync (5 pages × 1 s round-trip + write batch) could hit 30 s easily. Review after first manual smoke test; bump to 120 s if false-positive 409s appear.
- **R3: `tablesDB.upsertRow` per activity = N round-trips.** No batch endpoint in node-appwrite@24. For 150 activities = 150 round-trips. Wall-clock 5-8 s on Cloud — acceptable for v1. If it crawls in production, add `Promise.all` with concurrency cap of 10.

---

## Gate 1 Checklist

**Completeness:**
- [x] Problem stated specifically (post-onboarding empty-data gap)
- [x] Goal measurable (≤ 10s wall, ≤ 2 reads, idempotent re-sync)
- [x] User stories: 3 written
- [x] Requirements split: must-have / nice-to-have / out of scope
- [x] Out of scope explicit (DetailedActivity, webhooks, cron, hooks)

**Data Model:**
- [x] Existing `activities` schema reused, no changes to columns
- [x] New attribute (`users.syncInProgress`) typed and defaulted
- [x] Soft-delete: N/A (no deletes in this PR)
- [x] All datetimes UTC per `.claude/rules/core/TIMEZONE.md`

**API Design:**
- [x] Endpoint follows project pattern (`/api/<scope>/<action>`)
- [x] Request/response examples included
- [x] JSON field naming matches project convention (camelCase per `NAMING_CONVENTIONS.md`)
- [x] All error codes enumerated (401, 409, 500, 503)

**Quality:**
- [x] Edge cases listed: 10
- [x] Testing criteria for happy path
- [x] Testing criteria for refresh, concurrency, idempotency, rate-limit, UI smoke
- [x] Dependencies listed
- [x] Plan.md drift flagged

Gate 1: **PASS**.
