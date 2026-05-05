# Plan: Hooks (Phase 2)

**Spec**: `.planning/specs/p2-hooks.md`
**Epic**: Phase 2 — Onboarding + Sync
**Created**: 2026-05-05
**Status**: approved (Gate 2 — Vitest still deferred; verification = typecheck + lint + manual smoke)
**Branch**: `feat/p2-hooks`

## Architecture

```
Component (Phase 3+)
   ↓ useGoals() / useActivities()
TanStack Query
   ↓ fetch('/api/goals' | '/api/activities')
route handler (Next.js)
   ↓ requireUser() → auth.userId
   ↓ Query builder (userId scope + year/cursor + limit)
TablesDB.listRows(db, table, queries)
   ↓
{ rows, total }
   ↓ shape -> wire JSON
Browser
```

## Components Table

| Component | Type | Purpose |
|---|---|---|
| `GET /api/goals` (added to existing route) | Route | List goals for current year |
| `GET /api/activities` | Route | Paginated activity list |
| `useGoals` | Hook | TanStack `useQuery` wrapping goals route |
| `useActivities` | Hook | TanStack `useInfiniteQuery` wrapping activities route |
| `lib/goals/types.ts` | Types | `GoalRow` shape + `GoalsResponse` |
| `lib/strava/activityRow.ts` | Types | `ActivityRow` shape + `ActivitiesResponse` |

## File Locations

| File | New / Edit | Purpose |
|---|---|---|
| `src/app/api/goals/route.ts` | edit | Add `GET` export alongside existing `POST` |
| `src/app/api/activities/route.ts` | new | New `GET` route |
| `src/lib/hooks/useGoals.ts` | new | Hook |
| `src/lib/hooks/useActivities.ts` | new | Hook |
| `src/lib/goals/types.ts` | new | `GoalRow` + response types |
| `src/lib/strava/activityRow.ts` | new | `ActivityRow` + response types |

## Wave Decomposition

### Wave 1 — Shared types (no dependencies)

| WU | Task | Files |
|---|---|---|
| WU-1a | Create `src/lib/goals/types.ts`. Export `GoalRow` interface (mirror `ATTRS.goals` keys + Appwrite system fields `$id`, `$createdAt`, `$updatedAt`). Export `GoalsResponse = { year: number; goals: GoalRow[] }`. | `src/lib/goals/types.ts` |
| WU-1b | Create `src/lib/strava/activityRow.ts`. Export `ActivityRow` interface (mirror `ActivityRowPayload` from `sync.ts` + Appwrite system fields). Export `ActivitiesResponse = { limit: number; nextCursor: string \| null; activities: ActivityRow[] }`. | `src/lib/strava/activityRow.ts` |

### Wave 2 — Routes (depends on Wave 1)

| WU | Task | Files |
|---|---|---|
| WU-2a | Add `GET` export to `src/app/api/goals/route.ts`. Auth via `requireUser`. Parse `?year=` (default current UTC year, validate `[2000, 2100]`). Build `Query.equal(userId)` + `Query.equal(year)` + `Query.limit(50)`. Return `{ year, goals: result.rows }`. Handle errors → `{ error, message }` JSON. | `src/app/api/goals/route.ts` |
| WU-2b | Create `src/app/api/activities/route.ts`. Auth via `requireUser`. Parse `?limit=` (clamp 1-100, default 50) + `?cursor=` (opaque string, optional). Build queries: `Query.equal(userId)` + `Query.orderDesc(date)` + `Query.limit(parsedLimit)` + optional `Query.cursorAfter(parsedCursor)`. Return `{ limit, nextCursor, activities }` where `nextCursor = activities.length === parsedLimit ? activities[last].$id : null`. | `src/app/api/activities/route.ts` |

### Wave 3 — Hooks (depends on Wave 2 contracts)

| WU | Task | Files |
|---|---|---|
| WU-3a | Create `src/lib/hooks/useGoals.ts`. `useQuery({ queryKey: ['goals', year], queryFn, staleTime: 5*60*1000 })`. `queryFn` does `fetch('/api/goals?year=...')`, extracts backend error message per `FRONTEND.md`, returns `GoalsResponse`. | `src/lib/hooks/useGoals.ts` |
| WU-3b | Create `src/lib/hooks/useActivities.ts`. `useInfiniteQuery({ queryKey: ['activities', limit], queryFn, getNextPageParam: (last) => last.nextCursor ?? undefined, initialPageParam: undefined, staleTime: 60*1000 })`. `queryFn` builds URL with `cursor` from `pageParam` if defined. | `src/lib/hooks/useActivities.ts` |

## Parallel vs Sequential

| Wave | Parallel | Depends on |
|---|---|---|
| 1 | WU-1a, WU-1b | — |
| 2 | WU-2a, WU-2b | Wave 1 |
| 3 | WU-3a, WU-3b | Wave 2 |

Single-tab serial execution. Total ~6 small tasks, ~2 commits.

## Testing Plan

No automated tests this PR. Verification:

- `npm run build` after each wave (typecheck + Next compile)
- `npm run lint` after each wave
- Manual smoke after PR open:
  - DevTools fetch `/api/goals?year=2026` while signed in → 4 goals
  - DevTools fetch `/api/activities?limit=10` → 10 latest, `nextCursor` set
  - Follow nextCursor → next 10 rows, no overlap
  - Incognito as different user → no cross-user leak

## Risks (from spec)

- **R1** userId filter forgotten → reviewer must verify both routes have `Query.equal(userId, auth.userId)` as first predicate
- **R2** cursor semantics (ID not offset) → spec mandates `Query.cursorAfter`
- **R3** wire format → camelCase (existing routes pattern)
- **R4** `getNextPageParam` null vs undefined → explicit `?? undefined`
- **R5** year integer coercion → `Number.isInteger(parseInt(raw, 10))` + range check

## Gate 2 Checklist

- [x] Layered structure matches existing patterns (route → adminClient.tablesDB.listRows)
- [x] Each route enforces userId scoping at the predicate layer
- [x] All files listed
- [x] Each task ≤ 2 files / one commit
- [x] Wave dependencies explicit
- [x] Risks called out
- [x] LESSONS.md applied: TablesDB usage, lazy env reads in route handler, camelCase wire format

Gate 2: **PASS**.
