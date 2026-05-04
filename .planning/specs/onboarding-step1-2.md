# Spec: Onboarding Steps 1 + 2 (Photo + Goals)

**Created**: 2026-05-04
**Status**: draft
**Author**: atk81
**Epic**: Phase 2 — Onboarding + Sync (runStats production rebuild)
**Branch**: `feat/p2-onboarding-step1-2`
**Splits from**: plan.md `Phase 2 → Onboarding Flow`

---

## Problem

A user finishes Strava OAuth (PR #6/#7/#8) and lands on a placeholder "you're connected" screen. There is no way to upload a profile photo or define goals — both are prerequisites for the dashboard (volume hero, goal cards) and milestone share cards (duotone avatar). Without onboarding, the app has no per-user content to render and the user has no path forward from sign-in.

## Goal

A newly-connected runner can:

1. Reach `/onboarding` automatically after Strava connect (when `onboardingComplete=false`).
2. **Step 1 — Photo:** drop or pick an image, see it stylized as duotone (3 accent variants), upload it to Appwrite Storage `media` bucket, and continue.
3. **Step 2 — Goals:** edit 4 built-in goal targets (5K, 10K, half marathon, yearly volume), see realistic-target nudge copy, save to the `goals` collection, and continue.
4. Step 3 is reachable as a stub ("Step 3 of 3") to keep the prototype's progress UI intact; functional content lands in PR2.

A reload after either step's save preserves the data. Re-running Step 2 does not duplicate goals (idempotent upsert).

## Non-goals (saved for follow-up PRs)

- **Step 3 (auto-share preferences)** — wired in PR2.
- **`onboardingComplete=true` flag write** — PR2.
- **Redirect from `/onboarding` to `/dashboard` when complete** — depends on PR2's flag write; basic redirect-when-already-complete check IS in this PR (anticipates PR2).
- Goals editing UI on the Goals page — Phase 3.
- Avatar render anywhere outside the live-preview tile — dashboard wires it later.

## User Stories

- **As a returning runner mid-onboarding**, I want my goal targets persisted between page reloads, so I don't lose my edits if I refresh.
- **As a new runner**, I want my profile photo stylized in real time across 3 accent colors, so I know how it'll look on milestone cards before I commit.
- **As a runner who skips the photo**, I want a "skip for now" path so I'm not blocked on uploading a picture.

## Requirements

### Must-have (this PR)

**Routes**

- `app/(auth)/onboarding/page.tsx` — server component.
  - Read session cookie. No session → `redirect("/")`.
  - Read user doc. `onboardingComplete=true` → `redirect("/dashboard")`.
  - Render `<OnboardingClient initialAvatarFileId initialGoals />`. Pass any existing avatar file ID + existing goal rows (so re-entry preserves edits).
- `app/api/users/avatar/route.ts` — `POST` `multipart/form-data { file }`.
  - Auth via session cookie.
  - 10MB cap (matches bucket); reject `.gif/.svg` (bucket allows jpg/jpeg/png/webp only — Appwrite enforces, we 415 early for nicer UX).
  - Filename: `avatar-{userId}.{ext}` (per LESSONS — single shared bucket).
  - Use `Storage.createFile` on `media` bucket with file-level perms `read("user:{userId}")`, `update`/`delete("user:{userId}")` (not public).
  - On replace, delete prior `avatarFileId` first if present.
  - Update `users.{userId}.avatarFileId` to the new file ID.
  - Response: `{ avatarFileId, previewUrl }` where `previewUrl = `/api/users/avatar/raw` (added later) — for PR1 just return the file ID; client uses `URL.createObjectURL` from the source file for the preview.
- `app/api/goals/route.ts` — `POST` JSON `{ k5, k10, hm, volume }`.
  - Auth via session cookie.
  - Body shape:
    ```ts
    {
      k5:     { targetValue: string },  // "22:00"
      k10:    { targetValue: string },  // "47:00"
      hm:     { targetValue: string },  // "1:47:00"
      volume: { targetValue: number }   // 1000 (km)
    }
    ```
  - Server parses time strings → `targetSeconds`; rejects invalid format (400 with field-level details).
  - For each of `k5`, `k10`, `hm`, `volume`: upsert one row in `goals` with deterministic ID `g_{userId}_{goalKey}`. Set `userId`, `goalKey`, `name`, `type`, `distanceLabel`, `targetValue`, `targetSeconds` (time goals only), `year` (current year — derived from request, not stored client-side; keeps the row reusable next year), `isBuiltin: true`, `done: false`, `percentage: 0`.
  - Response: `{ goals: GoalRow[] }`.

**Components (new)**

- `src/components/onboarding/OnboardingClient.tsx` — `'use client'`. 3-step state machine. Owns `step`, `avatarFile` (File | null), `avatarFileId` (string | null), and `goals` form state.
- `src/components/onboarding/PhotoUpload.tsx` — drop zone + file input + uploaded confirmation tile (`primitives.jsx` lines 33-48 of prototype `onboarding.jsx`).
- `src/components/onboarding/DuotonePreview.tsx` — 3-accent live preview tile (`onboarding.jsx` lines 50-71).
- `src/components/onboarding/GoalSetting.tsx` — 4 inputs + nudge banner (`onboarding.jsx` lines 81-103).
- `src/components/onboarding/StepProgress.tsx` — 3-pill progress indicator (extracted from header).

**Lib**

- `src/lib/onboarding/timeFormat.ts` — `parseTimeToSeconds(str)` + `formatSecondsToTime(s)`. Accepts `mm:ss`, `hh:mm:ss`. Already implied by Phase 4 plan but pulled forward; will be reused for goal validation + later milestone formatting. **Keep narrow**: only the two functions PR1 needs.
- `src/lib/goals/defaults.ts` — `BUILTIN_GOAL_DEFAULTS` array + `goalKeyToMeta` lookup (`name`, `type`, `distanceLabel`).
- `src/lib/hooks/useOnboardingMutations.ts` — TanStack mutations: `useUploadAvatar()`, `useSaveGoals()`. Both invalidate `["me"]` on success so the user blob refreshes.

**Schema use (no migrations)**

- Reuses existing `goals` table attrs.
- Reuses existing `users.avatarFileId` attr.
- Reuses existing `media` bucket.

### Won't-do (this PR)

- Step 3 functional content + onboardingComplete flag (PR2).
- Avatar render endpoint (`/api/users/avatar/raw`) — only needed once dashboard renders avatars.
- Server-side image compression / resize — out of scope; bucket has a 10MB cap and the duotone effect uses the raw image client-side via CSS blend mode.
- Goals deletion / custom goals — Phase 3.

## Acceptance Criteria

- [ ] After Strava connect, user lands on `/onboarding` (when not yet complete).
- [ ] Step 1: drop a 2MB JPG → preview shows the photo in 3 accent colors → click Continue → no error → Step 2 visible.
- [ ] After Step 1, the file exists in Appwrite Storage `media` bucket with name `avatar-{userId}.jpg`. The user doc's `avatarFileId` matches.
- [ ] Step 1 "skip for now" advances to Step 2 without uploading anything; the user doc's `avatarFileId` stays empty.
- [ ] Step 2: edit each goal value → click Continue → all 4 goal rows exist in DB with correct `goalKey`, `targetSeconds` (or `targetValue` for volume), `year`, `isBuiltin=true`.
- [ ] Re-running Step 2 with edited values updates the existing rows (no duplicates).
- [ ] Reload during onboarding: photo preview disappears (objectURL is per-tab) but uploaded avatar fileId persists; goal form re-populates from existing rows.
- [ ] Step 3 placeholder visible with "Step 3 of 3" label + back button to Step 2.
- [ ] Build, lint, types green; ESLint allows the file.

## Out of band

- Plan.md drift: this PR ticks `Create app/(auth)/onboarding/page.tsx`, `Port Step 1`, `Implement avatar upload`, `Port Step 2`, `Implement goal creation API`. Leaves `Port Step 3` + `Mark onboardingComplete` for PR2.
- LESSONS to revisit if surfaced: storage file-permission gotchas (`fileSecurity=true` requires per-file `read()` perms), file-size limits via Next.js body parser (App Router default is 4MB unless overridden — avatar at 10MB needs explicit body-size config).
