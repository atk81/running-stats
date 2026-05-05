# Spec: Hooks (Phase 2)

**Created**: 2026-05-05
**Status**: draft
**Author**: team
**Epic**: Phase 2 — Onboarding + Sync
**Branch**: `feat/p2-hooks`

## Problem

Phase 3 dashboard, Phase 3 goals editor, and Phase 4 milestone feed all need to read goals + activities client-side. Today there's no `GET /api/goals` (only `POST` for onboarding seed) and no `/api/activities` route at all. Hooks the components will call (`useGoals`, `useActivities`) can't exist without the routes underneath.

## Goal

Two paginated/typed read endpoints + matching TanStack-Query hooks:

- `GET /api/goals?year=YYYY` — return current user's goals for a given year (default current UTC year)
- `GET /api/activities?limit=N&cursor=ID` — return current user's activities, paginated by Appwrite cursor (date-desc)
- `lib/hooks/useGoals.ts` — `useQuery`-based wrapper, key `["goals", year]`
- `lib/hooks/useActivities.ts` — `useInfiniteQuery`-based wrapper, key `["activities"]`, cursor-threaded

Success metrics:
- Goals fetch returns ≤ 50 rows for current year, ≤ 100ms server-side response
- Activities fetch returns ≤ 50 rows per page, no duplicates across page boundaries
- Both routes scope by `userId` from `requireUser()`, never trust query params for identity
- camelCase JSON on the wire (matches existing routes — no Axios interceptor in this project)

## User Stories

- **As a Phase 3 dashboard developer**, I want `useGoals()` to return the current user's 4 built-in goals so I can render the goal cards row.
- **As a Phase 3 dashboard developer**, I want `useActivities()` to return the latest 10 runs so I can render the recent runs list.
- **As a Phase 4 milestone-detection task**, I want `useActivities()` to paginate beyond the first 50 so streak detection can iterate older activities.

## Requirements

### Must-have

1. **`GET /api/goals`** route at `src/app/api/goals/route.ts` (extends existing file with new export — POST stays).
   - Auth: `requireUser()`.
   - Query params: `?year=YYYY` (4-digit int, optional). Default = current UTC year.
   - Validation: if `year` is present but not a 4-digit int in range `[2000, 2100]` → 400 `invalid_year`.
   - Appwrite query: `Query.equal(userId, auth.userId)`, `Query.equal(year, parsedYear)`, `Query.limit(50)`.
   - Response 200: `{ goals: GoalRow[], year: number }` — full row shape from Appwrite (camelCase already).
   - Errors: 401 unauthenticated, 400 `invalid_year`, 500 `goals_fetch_failed`.

2. **`GET /api/activities`** route — new file at `src/app/api/activities/route.ts`.
   - Auth: `requireUser()`.
   - Query params: `?limit=N` (default 50, max 100), `?cursor=<rowId>` (optional, Appwrite document ID).
   - Validation: `limit` parsed as int `[1, 100]`; out of range → clamp to bounds. `cursor` is opaque string; if present, pass to `Query.cursorAfter(cursor)`.
   - Appwrite query: `Query.equal(userId, auth.userId)`, `Query.orderDesc(date)`, `Query.limit(parsedLimit)`, optionally `Query.cursorAfter(parsedCursor)`.
   - Response 200: `{ activities: ActivityRow[], nextCursor: string | null, limit: number }`. `nextCursor` is the last row's `$id` if `activities.length === parsedLimit`, otherwise `null` (last page).
   - Errors: 401 unauthenticated, 400 `invalid_query` (cursor not a string, etc.), 500 `activities_fetch_failed`.

3. **`lib/hooks/useGoals.ts`** — TanStack `useQuery`.
   - Signature: `useGoals(year?: number)`.
   - Key: `["goals", year ?? currentUtcYear()]`.
   - Fetcher: `fetch('/api/goals?year=...', { credentials: 'include' })` → backend-error-message extraction per `.claude/rules/frontend-react/FRONTEND.md` → returns `GoalsResponse`.
   - Stale time: 5 minutes (goals don't churn often).

4. **`lib/hooks/useActivities.ts`** — TanStack `useInfiniteQuery`.
   - Signature: `useActivities({ limit }: { limit?: number } = {})`.
   - Key: `["activities", limit ?? 50]`.
   - `queryFn`: `fetch('/api/activities?limit=N&cursor=...')` → returns `{ activities, nextCursor, limit }`.
   - `getNextPageParam`: `(lastPage) => lastPage.nextCursor ?? undefined`.
   - `initialPageParam: undefined`.
   - Stale time: 1 minute (activities can update on re-sync).

5. **Shared response types** in `src/lib/strava/activityRow.ts` (new) — exports `ActivityRow` interface matching the row shape stored by PR #17 sync. Reuses `ActivityRowPayload` from `src/lib/strava/sync.ts` plus Appwrite system fields (`$id`, `$createdAt`, `$updatedAt`).

6. **Shared goal type** in `src/lib/goals/types.ts` (new file or extend existing `defaults.ts`) — exports `GoalRow` interface matching the goals row shape (existing `ATTRS.goals` keys + Appwrite system fields).

### Nice-to-have

- Sort goals server-side by built-in order (k5, k10, hm, volume) → defer; client can sort.
- Activity filter by type (?type=Run) → defer; not needed for Phase 3 dashboard.
- Total-count header for paginated activities → defer; nextCursor sentinel is enough.

### Out of scope

- `PATCH /api/goals/[id]` (Phase 3 Goals Editor)
- `DELETE /api/goals/[id]` (Phase 3 Goals Editor)
- `POST /api/goals` for custom goals (Phase 3 Goals Editor)
- Any UI consuming these hooks (Phase 3+)
- Optimistic update patterns for hook results (Phase 3 mutations will add)

## Data Model

No schema changes. Reads existing `goals` + `activities` collections written by prior PRs.

### Appwrite query construction (key risk per router)

```typescript
// goals route
const queries = [
  Query.equal(ATTRS.goals.userId, auth.userId),  // scope to caller
  Query.equal(ATTRS.goals.year, year),            // year filter
  Query.limit(50),
];

// activities route
const queries = [
  Query.equal(ATTRS.activities.userId, auth.userId),
  Query.orderDesc(ATTRS.activities.date),
  Query.limit(parsedLimit),
];
if (parsedCursor) queries.push(Query.cursorAfter(parsedCursor));
```

**The `Query.equal(userId, ...)` is non-negotiable.** Skipping it = data leak across users. Both routes must include it as the first predicate.

## API Contract

### `GET /api/goals?year=2026`

```json
// 200
{
  "year": 2026,
  "goals": [
    {
      "$id": "g_userId_k5_2026",
      "userId": "s12345",
      "goalKey": "k5",
      "name": "5K time",
      "type": "time",
      "distanceLabel": "5 km",
      "targetValue": "22:00",
      "targetSeconds": 1320,
      "year": 2026,
      "isBuiltin": true,
      "done": false,
      "percentage": 0,
      "$createdAt": "2026-01-...",
      "$updatedAt": "2026-01-..."
    }
  ]
}

// 400
{ "error": "invalid_year", "message": "year must be a 4-digit integer between 2000 and 2100" }

// 401
{ "error": "unauthenticated" }
```

### `GET /api/activities?limit=50&cursor=a12345`

```json
// 200
{
  "limit": 50,
  "nextCursor": "a98765",   // null if last page
  "activities": [
    {
      "$id": "a98765",
      "userId": "s12345",
      "stravaActivityId": "98765",
      "title": "Morning Run",
      "type": "Run",
      "date": "2026-05-04T...",
      "distanceMeters": 5230,
      "distanceKm": 5.23,
      "movingTimeSec": 1410,
      "elapsedTimeSec": 1530,
      "avgSpeedMps": 3.71,
      "avgPaceSecPerKm": 270,
      "maxSpeedMps": 4.5,
      "avgHeartrate": null,
      "maxHeartrate": null,
      "elevationGainM": 12,
      "summaryPolyline": "abc...",
      "prCount": 0,
      "achievementCount": 0,
      "processed": false,
      "$createdAt": "2026-05-04T...",
      "$updatedAt": "2026-05-04T..."
    }
  ]
}

// 401
{ "error": "unauthenticated" }
```

## UI Changes

None. Hooks are consumed in Phase 3+.

## Edge Cases

1. **No goals exist for the year** → return `{ year, goals: [] }` (200, not 404).
2. **No activities (new user before sync)** → return `{ limit, nextCursor: null, activities: [] }` (200).
3. **Cursor refers to a row from another user** → Appwrite returns rows after that ID by date-desc; the `Query.equal(userId, ...)` filter still scopes results, so leak is impossible. The cursor itself is just a row ID — guessable but useless without auth.
4. **Cursor refers to a deleted row** → Appwrite cursor pagination behavior: typically returns rows logically after the deleted point. Verify in smoke. If it errors, surface 400 `invalid_cursor`.
5. **`limit=0`** → clamp to 1 (Appwrite rejects 0). `limit=1000` → clamp to 100.
6. **`year=abc`** → 400 `invalid_year`.
7. **`year` missing** → default to `new Date().getUTCFullYear()` (UTC per `.claude/rules/core/TIMEZONE.md`).
8. **Page size lies on exact boundary (e.g. 50 activities, limit=50)** → `nextCursor` set, next page returns `[]` with `nextCursor: null`. Hook handles via `getNextPageParam` early-out.
9. **Concurrent re-sync mid-fetch** → activities list may include rows just inserted; idempotent — page numbers don't shift because cursor is row-ID based, not offset-based.
10. **Auth fails mid-route (token expired between cookie read + Appwrite call)** → 401 from inner Appwrite call → surface as 500 `goals_fetch_failed` or `activities_fetch_failed` (not 401, since `requireUser` already passed).

## Testing Criteria

No automated tests this PR (Vitest still deferred). Verification path:

- **Manual smoke (after merge):**
  - Sign in as user with synced activities → call `/api/goals?year=2026` from browser DevTools → verify 4 built-in goals returned, all with `userId` matching session.
  - Same user → `/api/activities?limit=10` → verify 10 newest activities by date-desc, `nextCursor` set.
  - Follow `nextCursor` → `/api/activities?limit=10&cursor=<id>` → verify next 10 rows, no duplicates with first page.
  - Different user (incognito) → `/api/goals?year=2026` → verify only THAT user's goals returned (no cross-user leak).
- **Type-check:** `npm run build` green
- **Lint:** `npm run lint` green
- **Hook smoke (in dev):** drop `useGoals()` + `useActivities()` calls into a sandbox component → verify shape compiles + data flows.

## Dependencies

- Existing: `requireUser`, `getAdminClient`, `ATTRS`/`COLLECTIONS`/`DATABASE_ID`, `Query` from `node-appwrite`, TanStack Query already wired in `Providers`.
- New: types in `lib/strava/activityRow.ts` + `lib/goals/types.ts`.
- No new npm packages.

## Risks (from router)

- **R1**: Forgetting `userId` filter on goals query → cross-user data leak. Mitigation: spec mandates as first predicate; phase-reviewer must verify.
- **R2**: Misunderstanding cursor pagination (offset vs ID) → page-boundary duplicates. Mitigation: spec uses `Query.cursorAfter(rowId)` not page numbers; nextCursor returns last row's `$id`.
- **R3**: Snake_case introduced on the wire by accident → breaks existing routes' contract. Mitigation: existing routes return camelCase directly (no interceptor); spec aligns.
- **R4**: `getNextPageParam` returns `null` instead of `undefined` → TanStack misbehavior. Mitigation: explicit `?? undefined` mapping in hook.
- **R5**: `year` integer coercion silently accepts `"2026.0"` or floats. Mitigation: parse with `Number.isInteger(parseInt(raw, 10))` strict check + range bounds.

## Plan.md drift to flag in PR

- Phase 3 line `Implement GET /api/goals (list user's goals)` ticks early in this PR. Note in PR description.
- Phase 3 implicit `GET /api/activities` (used by "Recent runs list (from useActivities)" line 122) ticks early. No separate plan.md line — plan only enumerates the consumer.

## Gate 1 Checklist

**Completeness:**
- [x] Problem stated specifically
- [x] Goal measurable (response shapes, scoping rules)
- [x] User stories: 3 (dashboard, goals editor, milestone detector)
- [x] Requirements split: must-have / nice-to-have / out of scope
- [x] Out of scope explicit

**Data Model:**
- [x] No schema changes; reuse existing rows
- [x] Query construction documented with userId-first predicate

**API Design:**
- [x] Endpoints follow project pattern (`/api/<scope>`)
- [x] Request/response examples included with full row shapes
- [x] camelCase wire format confirmed
- [x] All error codes enumerated

**Quality:**
- [x] Edge cases listed: 10
- [x] Testing criteria for happy path + cross-user
- [x] Dependencies listed
- [x] Plan.md drift flagged

Gate 1: **PASS**.
