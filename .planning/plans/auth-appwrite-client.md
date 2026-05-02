# Plan: Auth + Appwrite Client

**Spec**: .planning/specs/auth-appwrite-client.md
**Epic**: Phase 1 — Foundation
**Created**: 2026-05-02
**Status**: draft
**Branch**: `feat/p1-auth-appwrite-client`
**Stack**: Next.js 16 (App Router) + React 19 + TypeScript + node-appwrite + appwrite (browser)

---

## Stack notes

- **Runtime for API routes** = Node (default for `route.ts`). `node-appwrite` is Node-native; Edge unverified. All four `/api/auth/*` routes opt into Node by NOT exporting `runtime = 'edge'`. `lib/utils/encryption.ts` uses Web Crypto (`globalThis.crypto.subtle`) which is available in Node 20+ and Edge — keeps door open to flip later.
- **Cookies API** = `cookies()` is async (Next 15+). Pattern: `const c = await cookies(); c.set(...);` then `return NextResponse.redirect(...)`.
- **TanStack Query** already installed (v5.100.8). UserProvider uses `useQuery({ queryKey: ['me'] })` w/ `staleTime: Infinity` + manual `invalidate` on logout.
- **Path alias** `@/*` → `./src/*` (per `tsconfig.json`).
- **No test runner installed.** Verification = `npm run build` + `npm run lint` + manual smoke per spec testing criteria. Vitest install deferred to Phase 2.

## Architectural trade-offs

| Decision | Picked | Alternative | Why |
|----------|--------|-------------|-----|
| Admin Appwrite client lifecycle | Singleton w/ lazy init | Per-request factory | Single-tenant admin; no per-request state. Tiny perf win, cleaner imports |
| Session client lifecycle | Per-request factory `getSessionClient(secret)` | Singleton w/ session swap | Concurrent requests must not race on shared session state |
| Runtime | Node | Edge | `node-appwrite` SDK; encryption.ts uses Web Crypto so Edge migration possible later |
| `/api/auth/me` cache | `staleTime: Infinity`, invalidate on logout | Polling / interval | Profile rarely changes; refresh on visibility change later if needed |
| Cookie attrs | `httpOnly`, `secure` (in prod), `sameSite=lax`, `path=/` | `sameSite=strict` | Lax allows Strava redirect-back to land authenticated. Strict would drop the cookie on cross-site GET nav |
| `secure` flag in dev | `secure: process.env.NODE_ENV === 'production'` | Always `secure: true` | Dev runs on `http://localhost:3000` → secure cookies wouldn't be sent. Branch on env |
| Returning-user detection | Try `users.create` → catch 409 → lookup by email | Pre-check `users.list({ email })` | One round-trip in happy path (new user) vs always-two |

---

## Components

| Component | Type | Purpose |
|-----------|------|---------|
| `encrypt` / `decrypt` | Utility | AES-GCM round-trip w/ `v1:` versioned ciphertext format |
| `getStravaAuthorizeUrl` | Utility | Builds Strava `/oauth/authorize` URL w/ params |
| `exchangeStravaCode` | Utility | POSTs to Strava `/oauth/token`, returns `TokenResponse` |
| `getAdminClient` | Factory (cached) | Returns admin-keyed `Client` + `Users` + `Databases` |
| `getSessionClient(secret)` | Factory (per call) | Returns session-keyed `Client` + `Account` for one request |
| `appwriteClient` | Singleton | Browser `Client` for client-side reads (UserProvider doesn't use it directly; reserved for future) |
| `COLLECTIONS`, `DATABASE_ID`, `ATTRS` | Constants | Typed IDs/attribute names mirror `appwrite.json` |
| `GET /api/auth/strava` | Route handler | Build authorize URL, set state cookie, 302 to Strava |
| `GET /api/auth/strava/callback` | Route handler | Validate state, exchange code, upsert user + doc, mint session, set cookie, 302 |
| `POST /api/auth/logout` | Route handler | Delete Appwrite session, clear cookie, 204 |
| `GET /api/auth/me` | Route handler | Resolve session → return profile JSON |
| `UserProvider` | React client context | Wraps app, fetches `/api/auth/me` via TanStack Query |
| `useUser` | Hook | Consumes UserProvider context |

## File locations

| File | Location | Purpose |
|------|----------|---------|
| `encryption.ts` | `src/lib/utils/` | AES-GCM helpers (Web Crypto) |
| `types.ts` | `src/lib/strava/` | `TokenResponse`, `SummaryAthlete`, `OAuthScope` types |
| `oauth.ts` | `src/lib/strava/` | URL builder + code exchange |
| `collections.ts` | `src/lib/appwrite/` | DB ID, collection IDs, attribute name constants |
| `client.ts` | `src/lib/appwrite/` | Browser Appwrite SDK client |
| `server.ts` | `src/lib/appwrite/` | `getAdminClient()`, `getSessionClient(secret)` factories |
| `route.ts` | `src/app/api/auth/strava/` | `GET` — start flow |
| `route.ts` | `src/app/api/auth/strava/callback/` | `GET` — finish flow |
| `route.ts` | `src/app/api/auth/logout/` | `POST` — logout |
| `route.ts` | `src/app/api/auth/me/` | `GET` — current profile |
| `Providers.tsx` | `src/lib/contexts/` | Combines `QueryClientProvider` + `UserProvider`; consumed by root layout |
| `UserProvider.tsx` | `src/lib/contexts/` | `useQuery` for `/api/auth/me`, exposes context |
| `useUser.ts` | `src/lib/hooks/` | Re-exports context consumer |
| `.env.example` | repo root | Documents env var shape (no secrets) |

## Files to change

| File | What changes | Why |
|------|--------------|-----|
| `src/app/layout.tsx` | Wrap `<body>` children in `<Providers>` | UserProvider + QueryClientProvider must be ancestors of any page using `useUser` |
| `.gitignore` | Add `.env.local` (likely already present from `create-next-app`) | Verify; no new entry if Next default already covers |

---

## Waves (dependency-ordered work units)

### Wave 1 — leaf libs (no deps on this PR's other files)

Run in parallel.

| WU | Task | Files | Spec ref |
|----|------|-------|----------|
| 1 | Implement AES-GCM encrypt/decrypt with `v1:` versioned format. Reads `TOKEN_ENCRYPTION_KEY` (64 hex). Throws at module load if missing/wrong length. | `src/lib/utils/encryption.ts` | Must-have crypto, edge case 6 |
| 2 | Define Strava token + athlete types matching docs. | `src/lib/strava/types.ts` | API contract types |
| 3 | Define Appwrite DB constants: `DATABASE_ID = "runstats_db"`, `COLLECTIONS`, `ATTRS.users`, `ATTRS.goals`, etc. Mirror `appwrite.json`. | `src/lib/appwrite/collections.ts` | Must-have lib |

**Verification per WU:** `npm run build` (all WUs) + `npm run lint`. WU-1 also: write a tiny throwaway script under `/tmp` that calls encrypt/decrypt round-trip on a fixed string; delete after.

### Wave 2 — clients + Strava OAuth (depends on Wave 1)

Run in parallel.

| WU | Task | Files | Depends on | Spec ref |
|----|------|-------|------------|----------|
| 4 | Browser Appwrite client (project + endpoint, no admin). Reads `NEXT_PUBLIC_*` env. | `src/lib/appwrite/client.ts` | — | Must-have lib |
| 5 | Server-side factories: `getAdminClient()` (cached), `getSessionClient(secret)` (per-call). Reads `APPWRITE_API_KEY` + `NEXT_PUBLIC_*`. | `src/lib/appwrite/server.ts` | — | Must-have lib |
| 6 | Strava OAuth helpers: `buildAuthorizeUrl({ state, scope })`, `exchangeCode(code)`. Reads `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REDIRECT_URI`. | `src/lib/strava/oauth.ts` | WU-2 (types) | Must-have lib |

### Wave 3 — API routes (depends on Wave 1 + 2)

Run in parallel.

| WU | Task | Files | Depends on | Spec ref |
|----|------|-------|------------|----------|
| 7 | `GET /api/auth/strava`: random 32-byte hex state → set `oauth_state` httpOnly cookie (5 min) → 302 to authorize URL | `src/app/api/auth/strava/route.ts` | WU-6 | Must-have route |
| 8 | `GET /api/auth/strava/callback`: validate state, exchange code, upsert Appwrite user (catch 409 → lookup), upsert users doc w/ encrypted tokens, mint session, set `a_session_<PROJECT_ID>` cookie, clear `oauth_state`, 302 to `/` | `src/app/api/auth/strava/callback/route.ts` | WU-1, WU-3, WU-5, WU-6 | Must-have route, edge cases 1, 2, 3, 5, 7 |
| 9 | `POST /api/auth/logout`: read session cookie → `account.deleteSession('current')` (best effort) → clear cookie → 204 | `src/app/api/auth/logout/route.ts` | WU-5 | Must-have route |
| 10 | `GET /api/auth/me`: read session cookie → `account.get()` → load users doc → return profile JSON; 401 on missing/invalid | `src/app/api/auth/me/route.ts` | WU-3, WU-5 | Must-have route, edge case 8 |

### Wave 4 — client context (depends on Wave 3)

Sequential, single WU touching two files (under 3-file rule).

| WU | Task | Files | Depends on |
|----|------|-------|------------|
| 11 | `UserProvider.tsx` w/ `useQuery({ queryKey: ['me'], staleTime: Infinity, retry: false })`; `useUser.ts` thin consumer hook; `Providers.tsx` combining QueryClientProvider + UserProvider | `src/lib/contexts/UserProvider.tsx`, `src/lib/contexts/Providers.tsx`, `src/lib/hooks/useUser.ts` | WU-10 |

### Wave 5 — integration + env doc

Sequential.

| WU | Task | Files | Depends on |
|----|------|-------|------------|
| 12 | Wire `<Providers>` into root layout; verify build still passes | `src/app/layout.tsx` | WU-11 |
| 13 | Document env shape in `.env.example` (no secret values) | `.env.example` | — |

---

## Parallel vs sequential summary

| Parallel group | WUs | Why |
|----------------|-----|-----|
| Wave 1 | 1, 2, 3 | Pure leaf modules, no inter-dep |
| Wave 2 | 4, 5, 6 | Each depends only on Wave 1, not each other |
| Wave 3 | 7, 8, 9, 10 | Independent route files; share imports but no inter-route deps |

| Sequential | Depends on | Why |
|-----------|-----------|-----|
| Wave 2 | Wave 1 | WU-6 imports `TokenResponse` from WU-2 |
| Wave 3 | Wave 1 + 2 | Routes import all libs |
| WU-11 | Wave 3 | UserProvider hits `/api/auth/me` (WU-10) |
| WU-12 | WU-11 | Layout imports `Providers` |
| WU-13 | — | Independent, do anytime; pair with WU-12 commit |

Single-tab execution still fine — each wave just gates on the previous. Multi-tab parallelization is optional optimization.

---

## Commit-per-WU plan

Per CLAUDE.md "atomic commits" rule. 13 commits before Stage 4 + simplify + lessons commits.

```
feat(appwrite): add encryption utility (AES-GCM v1)            # WU-1
feat(strava): add Strava OAuth + athlete types                 # WU-2
feat(appwrite): add collection + attribute constants           # WU-3
feat(appwrite): add browser SDK client                         # WU-4
feat(appwrite): add server SDK factories (admin + session)     # WU-5
feat(strava): add OAuth URL builder + token exchange           # WU-6
feat(auth): add /api/auth/strava initiator route               # WU-7
feat(auth): add /api/auth/strava/callback route                # WU-8
feat(auth): add /api/auth/logout route                         # WU-9
feat(auth): add /api/auth/me route                             # WU-10
feat(auth): add UserProvider + useUser hook + Providers shell  # WU-11
feat(config): wire Providers into root layout                  # WU-12
docs(config): add .env.example                                 # WU-13
```

Bundling rule: if two WUs in the same wave touch obviously paired files (e.g. types + a single consumer), they can ship as one commit. Default: one WU per commit.

---

## Test plan

No automated test runner installed. Manual + build-gate verification.

### Per-WU build gate
- After each WU: `npm run build` + `npm run lint` green. No unused exports, no TS errors.

### Manual smoke (after Wave 5, before /simplify)

Pre-req: `.env.local` populated. Strava app registered with `STRAVA_REDIRECT_URI=http://localhost:3000/api/auth/strava/callback`.

| # | Step | Expected | Spec edge |
|---|------|----------|-----------|
| S1 | `npm run dev`; open `http://localhost:3000/api/auth/strava` | 302 to `https://www.strava.com/oauth/authorize?...` w/ `oauth_state` cookie set | Must-have route 1 |
| S2 | Authorize on Strava → land back on `/` | `users` collection has new doc; encrypted tokens start with `v1:`; `a_session_<PROJECT_ID>` cookie set | Must-have routes 2-3 |
| S3 | `GET /api/auth/me` | 200 w/ `{ userId, name, handle, city, ... }` | Must-have route 4 |
| S4 | Reload page → `GET /api/auth/me` again | Still 200 | Goal "session persists" |
| S5 | `POST /api/auth/logout` | 204; cookie cleared; `GET /api/auth/me` → 401 | Must-have route 3 |
| S6 | Re-run S1-S2 as same Strava user | Existing users doc updated (not duplicated); new session minted | Edge 3 (returning runner) |
| S7 | Hand-tamper `oauth_state` cookie before redirect | Callback returns 400 `invalid_state` | Edge 1 |
| S8 | Wait > 5 min on Strava authorize page → click Authorize | Callback returns 400 (cookie expired) | Edge 2 |
| S9 | Set `TOKEN_ENCRYPTION_KEY` to wrong length, restart dev | Module load throws clear error before request hits | Edge 6 |

### Deferred (Vitest install in Phase 2)

- `encrypt` / `decrypt` round-trip unit test
- `decrypt` rejects unknown prefix
- `buildAuthorizeUrl` includes all required params
- `exchangeCode` posts correct grant_type to correct URL

---

## Critical files (highest risk, review hardest)

1. `src/app/api/auth/strava/callback/route.ts` — most logic, most env reads, most failure modes (8 of 10 edge cases). Worth highest review attention.
2. `src/lib/utils/encryption.ts` — crypto correctness; bug here = unrecoverable token storage.
3. `src/lib/appwrite/server.ts` — admin client lifecycle; bug here = either credential leak or per-request state bleed.

---

## Risks not yet covered

- **Strava `username` may be missing.** Spec edge 10 noted; callback must synthesize. Test S2 covers a real account; if `username` happens to be set, we never exercise the fallback. Add a stub log warning when fallback fires so manual verification surfaces it.
- **First-deploy flake.** Strava redirect URI must be registered in Strava app dashboard before first OAuth attempt; mismatch returns Strava's "Authorization Error" page, not our callback. Document in PR body.
- **Free-tier session quota.** Appwrite Cloud Free has session caps; not yet hit but flag if seen.

---

## Out of plan (deferred per spec)

- `lib/strava/api.ts` fetch wrapper w/ auto-refresh — Phase 2
- `lib/strava/tokenRefresh.ts` — Phase 2
- Onboarding gate logic in callback redirect — Phase 2
- Email verification — never (synthetic email)
- Avatar mirror to media bucket — Phase 2 onboarding photo

---

## Cross-phase scope-pull (from spec)

`src/lib/utils/encryption.ts` belongs to Phase 2 → Strava Activity Sync per `plan.md`. Shipped here because callback (WU-8) depends on it. Stage 4 will tick BOTH:
- Phase 1 → Auth + Appwrite Client (all 9 lines)
- Phase 2 → Strava Activity Sync → `Create lib/utils/encryption.ts (AES-256 encrypt/decrypt for Strava tokens)`

PR body must call this out so reviewer doesn't flag drift.
