# Spec: Auth + Appwrite Client

**Created**: 2026-05-02
**Status**: draft
**Author**: atk81
**Epic**: Phase 1 — Foundation (runStats production rebuild)
**Branch**: `feat/p1-auth-appwrite-client`

---

## Problem

Runners can't use runStats today because there's no way to sign in or attach their Strava account. Without an authenticated user record + stored Strava tokens, every downstream feature (sync, dashboard, milestones, share) is blocked. The product is gated on a single missing flow: **runner clicks "Connect Strava" → returns authenticated, with their Strava tokens stored and a session cookie set**.

## Goal

A first-time visitor can complete Strava OAuth and end on a page that proves they are authenticated. Concretely:

- Click "Connect Strava" → redirected to Strava authorize page → grant access → redirected back to runStats.
- Server has: an Appwrite Auth user (`user.$id`), a `users` collection doc keyed by that id with their Strava athlete summary + AES-GCM encrypted tokens, and an Appwrite session cookie set on the browser.
- `GET /api/auth/me` returns the user profile (name, handle/username, city, avatar URL, `onboardingComplete`).
- Refreshing the page keeps the session.
- `POST /api/auth/logout` clears the session, and a subsequent `/api/auth/me` returns 401.

## User Stories

- **As a runner who has never used runStats**, I want to click one button and connect my Strava account, so that the app can read my activities and start tracking my goals.
- **As a runner who closed the tab mid-session**, I want my session to persist on the next visit, so that I don't have to re-authorize Strava every time I reload.
- **As a runner who wants to stop using runStats**, I want a way to log out, so that my session ends on this device.

## Requirements

### Must-have (this PR)

**Lib (4 files)**

- `src/lib/appwrite/client.ts` — browser SDK client. Reads `NEXT_PUBLIC_APPWRITE_ENDPOINT` + `NEXT_PUBLIC_APPWRITE_PROJECT_ID` from env. Exports configured `Client`, `Account`, `Databases`, `Storage`. **No admin key.**
- `src/lib/appwrite/server.ts` — server-side SDK client factory. Two factories:
  - `getAdminClient()` — uses `APPWRITE_API_KEY` (admin). For user-creation, server-side session mint, and writing `users` collection on signup.
  - `getSessionClient(sessionSecret: string)` — uses the user's session cookie value. For per-request auth checks (`/api/auth/me`).
- `src/lib/appwrite/collections.ts` — typed constants: `DATABASE_ID = "runstats_db"`; `COLLECTIONS = { users, goals, activities, milestones, personalRecords }`; per-collection attribute name objects mirroring `appwrite.json`. No business logic.
- `src/lib/strava/oauth.ts` — pure OAuth helpers:
  - `buildAuthorizeUrl({ state }): string` → returns `https://www.strava.com/oauth/authorize?...`
  - `exchangeCode(code: string): Promise<TokenResponse>` → POSTs to `https://www.strava.com/oauth/token` with `grant_type=authorization_code`.
  - Exports `TokenResponse` type (`access_token`, `refresh_token`, `expires_at`, `expires_in`, `athlete`, `scope`).

**Crypto (pulled forward from Phase 2)**

- `src/lib/utils/encryption.ts` — AES-GCM helpers using Web Crypto (Edge-compatible):
  - `encrypt(plaintext: string): Promise<string>` → returns `v1:{base64(iv|ciphertext|tag)}`.
  - `decrypt(payload: string): Promise<string>` → reads version prefix, fails fast on unknown prefix.
  - Key derived from `TOKEN_ENCRYPTION_KEY` (32-byte hex env var).
  - **Versioned prefix shipped from day 1** to allow future key rotation without format break (Office Hours decision iv-c).

**API routes (4)**

- `GET /api/auth/strava` → builds Strava authorize URL with random `state` (32-byte hex), sets `oauth_state` httpOnly cookie (5 min maxAge, sameSite=lax), returns 302 to Strava.
- `GET /api/auth/strava/callback?code=...&state=...` →
  1. Read `oauth_state` cookie, compare with query `state`. Mismatch → 400.
  2. POST to Strava `/oauth/token` to exchange code → `{ access_token, refresh_token, expires_at, athlete }`.
  3. Synthesize email: `strava-{athlete.id}@runstats.local`.
  4. Derive deterministic Appwrite userId = `s{athlete.id}` (Strava athlete IDs are globally unique integers; prefix `s` keeps the ID Appwrite-valid). Try `users.create(userId, email, undefined, undefined, name)`. If 409 conflict → user already exists, fall through with the same userId. (No email-based lookup needed.)
  5. Encrypt access + refresh tokens.
  6. Upsert `users` collection doc keyed by `user.$id`: `{ name, handle, city, stravaAthleteId, stravaAccessToken (encrypted), stravaRefreshToken (encrypted), stravaTokenExpiresAt, accentColor: "#FF6800", autoSharePR: true, autoShareVolume: true, autoShareWeeklyRecap: true, onboardingComplete: false, lastSyncAt: null }`.
  7. `users.createSession(user.$id)` → session secret + expire.
  8. Set Appwrite session cookie `a_session_{PROJECT_ID}` (httpOnly, secure, sameSite=lax, path=/, maxAge=session.expire).
  9. Delete `oauth_state` cookie.
  10. 302 redirect to `/` (Phase 2 onboarding gate decides where they actually land).
- `POST /api/auth/logout` → call Appwrite `account.deleteSession('current')` via session client; clear `a_session_{PROJECT_ID}` cookie; return 204.
- `GET /api/auth/me` → read session cookie; if absent → 401. Else hydrate `getSessionClient(sessionSecret)` → `account.get()` → load `users` doc → return `{ userId, name, handle, city, avatarFileId, accentColor, onboardingComplete, lastSyncAt }`. **Never** return Strava tokens or email.

**Client context**

- `src/lib/contexts/UserProvider.tsx` — `'use client'`. Wraps `useQuery({ queryKey: ['me'], queryFn: () => fetch('/api/auth/me').then(r => r.ok ? r.json() : null) })`. Exposes `{ user, loading, error, refetch }`.
- `src/lib/hooks/useUser.ts` — thin re-export of context consumer.

### Nice-to-have (NOT this PR)

- Centralized `lib/strava/api.ts` fetch wrapper with auto-refresh on 401 — Phase 2.
- `lib/strava/tokenRefresh.ts` — Phase 2.
- Onboarding redirect logic in callback — Phase 2.
- Disconnect-Strava + deauthorize call to Strava — Phase 7 settings.

### Out of scope

- Email verification (synthesized email is a placeholder; we don't ask Strava for `read:profile:email`).
- Strava webhook subscription — Phase 5.
- Strava activity sync (`POST /api/strava/sync`) — Phase 2.
- Avatar upload to `media` bucket — Phase 2.
- React UI for the post-OAuth landing — Phase 1 next section (Core Layout).
- Mobile OAuth (`/oauth/mobile/authorize`) — web only at launch per plan.md.
- Multi-account support — one Strava per user.

## Data Model

**No new tables.** Uses existing `users` collection from PR #2. New writes:

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `userId` | string(36) | Appwrite Auth `user.$id` | Doc ID = userId |
| `name` | string(128) | `athlete.firstname + " " + athlete.lastname` | |
| `handle` | string(64) | `"@" + (athlete.username ?? "athlete-" + athlete.id)` | Strava `username` may be null |
| `city` | string(128) | `athlete.city` | May be empty |
| `stravaAthleteId` | string(20) | `String(athlete.id)` | Unique index already exists |
| `stravaAccessToken` | string(256) | `encrypt(token_response.access_token)` | `v1:base64...` format |
| `stravaRefreshToken` | string(256) | `encrypt(token_response.refresh_token)` | |
| `stravaTokenExpiresAt` | integer | `token_response.expires_at` | Unix seconds |
| `accentColor` | string(7) | constant `"#FF6800"` | Default |
| `autoSharePR/Volume/WeeklyRecap` | boolean | `true` | Default per plan.md |
| `onboardingComplete` | boolean | `false` | Phase 2 flips after onboarding |
| `lastSyncAt` | datetime | `null` | Phase 2 sets |

**Avatar:** Strava `athlete.profile` URL is NOT mirrored to our `media` bucket here; `avatarFileId` left empty until Phase 2 onboarding photo upload.

## API Changes

### `GET /api/auth/strava`

```
Request:  GET /api/auth/strava
Response: 302 Location: https://www.strava.com/oauth/authorize?...
Cookies set: oauth_state (httpOnly, sameSite=lax, maxAge=300, path=/)
```

### `GET /api/auth/strava/callback`

```
Request:  GET /api/auth/strava/callback?code=<code>&state=<state>&scope=<scope>
Success:  302 Location: /
          Cookies set: a_session_<PROJECT_ID> (httpOnly, secure, sameSite=lax, path=/, maxAge=<session.expire>)
          Cookies cleared: oauth_state
Errors:
  - state mismatch → 400 { error: "invalid_state" }
  - Strava token exchange fails → 502 { error: "strava_token_exchange_failed", detail: <strava body> }
  - Appwrite user create fails → 500 { error: "user_create_failed" }
```

### `POST /api/auth/logout`

```
Request:  POST /api/auth/logout
Response: 204
Cookies cleared: a_session_<PROJECT_ID>
Errors:
  - no session cookie → 204 (idempotent)
  - Appwrite session delete fails → 204 (cookie cleared anyway, log warning)
```

### `GET /api/auth/me`

```
Request:  GET /api/auth/me
Success:  200 { userId, name, handle, city, avatarFileId, accentColor, onboardingComplete, lastSyncAt }
Errors:
  - no session cookie → 401 { error: "unauthenticated" }
  - session invalid (Appwrite rejects) → 401 { error: "session_invalid" }, clear cookie
  - users doc missing → 500 { error: "user_doc_missing" }
```

JSON field naming: `camelCase` (project convention — frontend axios interceptors handle conversion, but these are Next route handlers so we own JSON shape directly; matching existing `users` collection attribute camelCase mirrors what the client expects).

## UI Changes

**None in this PR.** Connect-Strava button + landing page = next section (Core Layout). UserProvider gets wired into `app/layout.tsx` here so consumers in Core Layout pick it up.

## Edge Cases

1. **State mismatch / replay.** Attacker forges callback with stale `state`. → cookie comparison fails → 400.
2. **State cookie expired** (user took >5 min on Strava authorize page). → comparison fails → 400 with "session expired, please try again" message.
3. **Returning runner** (already has Appwrite user from prior connect). `users.create()` throws 409 conflict → catch via `instanceof AppwriteException && code === 409`, fall through with deterministic `s{athleteId}` userId, upsert users doc + mint new session. No email lookup needed.
4. **Strava webhook race** (Phase 5 concern, surface here): Strava callback could in theory fire mid-create. Not relevant — webhook is Phase 5, listed for future awareness.
5. **Token > 256 chars after encrypt.** Strava tokens are ~40 chars; AES-GCM + base64 + `v1:` prefix → ~95 chars. Hard fail in tests if regression.
6. **`TOKEN_ENCRYPTION_KEY` missing or wrong length.** Throw at module load with clear message: `TOKEN_ENCRYPTION_KEY must be 64 hex chars (32 bytes)`.
7. **Concurrent callback** (user double-clicks "Connect"): two callbacks race the `users.create`. Catch 409 in second one → fall through to update path.
8. **Appwrite session cookie tampered.** `account.get()` rejects → 401 + clear cookie.
9. **Strava revoked from athlete settings.** Subsequent API calls (Phase 2) get 401 from Strava → handled in lazy refresh wrapper. Not this PR.
10. **`athlete.username` null.** Synthesize handle from athlete id. Documented above.

## Testing Criteria

**Manual smoke (this PR — no automated test runner installed yet):**

- `npm run build` + `npm run lint` green.
- With `.env.local` populated: hit `/api/auth/strava` in browser → redirected to Strava → click Authorize → land back on `/`. Check:
  - `users` collection has new doc with my Strava athlete id and encrypted tokens (length matches `v1:...` format).
  - Browser has `a_session_<PROJECT_ID>` cookie.
  - `GET /api/auth/me` returns my profile JSON.
- Refresh page → `/api/auth/me` still returns profile.
- `POST /api/auth/logout` → cookie cleared → `/api/auth/me` returns 401.
- Click "Connect Strava" again as same user → existing `users` doc updated (not duplicated), new session minted.
- Tamper with `oauth_state` cookie before redirect → callback returns 400.

**Unit-test-shaped checklist (deferred until Vitest installed in Phase 2):**

- `encrypt` + `decrypt` round-trip for known plaintext.
- `decrypt` rejects payload without `v1:` prefix.
- `buildAuthorizeUrl` includes all required Strava params.
- `exchangeCode` posts to correct endpoint with correct grant_type.

## Dependencies

**Runtime (already installed):** `appwrite`, `node-appwrite`, `@tanstack/react-query`, `next`, `react`.

**No new packages.** Web Crypto is built-in.

**Env vars required (add to `.env.local` — gitignored):**

```
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=<from appwrite.json>
APPWRITE_API_KEY=<admin key, console > settings>
STRAVA_CLIENT_ID=<from Strava app settings>
STRAVA_CLIENT_SECRET=<from Strava app settings>
STRAVA_REDIRECT_URI=http://localhost:3000/api/auth/strava/callback
TOKEN_ENCRYPTION_KEY=<openssl rand -hex 32>
```

**External:**
- Strava API app must be registered (https://www.strava.com/settings/api), with callback domain matching `STRAVA_REDIRECT_URI` host (e.g. `localhost`).
- Appwrite project + `users` collection already provisioned (PR #2).

**Files this PR adds (estimated 11):**

```
src/lib/appwrite/client.ts
src/lib/appwrite/server.ts
src/lib/appwrite/collections.ts
src/lib/strava/oauth.ts
src/lib/strava/types.ts            (TokenResponse, SummaryAthlete shapes)
src/lib/utils/encryption.ts
src/lib/contexts/UserProvider.tsx
src/lib/hooks/useUser.ts
src/app/api/auth/strava/route.ts
src/app/api/auth/strava/callback/route.ts
src/app/api/auth/logout/route.ts
src/app/api/auth/me/route.ts
```

(Plus `src/app/layout.tsx` modified to wire UserProvider + QueryClientProvider.)

## Architectural decisions captured (Office Hours)

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Session = Appwrite Auth session cookie (`a_session_<PROJECT_ID>`) | Native, server-validatable, no custom JWT to maintain |
| 2 | Token encryption = Web Crypto AES-GCM | Edge-compatible runtime, lowest common denominator |
| 3 | OAuth state CSRF = signed httpOnly cookie | No server store needed; 5 min lifetime |
| 4 | User identity = deterministic Appwrite userId = `s{stravaAthleteId}`; `users` doc id matches | Eliminates email-lookup round-trip on returning user; Strava athlete IDs are globally unique integers |
| 5 | Token refresh = lazy (Phase 2 wrapper) | Avoid background middleware now |
| 6 | Encryption format = `v1:base64(iv\|ciphertext\|tag)` from day 1 | Future key rotation without breaking format |
| 7 | Pull `lib/utils/encryption.ts` forward from Phase 2 | Required by callback; shipping minimal partial helper would just be churn |

## Cross-phase scope-pull (must surface in PR body + Stage 4)

- `lib/utils/encryption.ts` is listed under **Phase 2 → Strava Activity Sync** in `plan.md`. Shipping it here. Stage 4 will tick that line in the Phase 2 section in addition to all 9 lines in this section. Note in PR body.
