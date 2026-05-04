# RunStats — Production Implementation Plan

## Context

Transform the HTML/CSS/JS prototype (`runstats/`) into a production web app serving ~1000 runners with real Strava integration, persistent data, and actual image export.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend + API | **Next.js** (App Router, TypeScript) |
| Backend Services | **Appwrite** (Auth, Database, Storage, Functions) |
| Deployment | **Appwrite Sites** (SSR) |
| Styling | **Tailwind CSS** + prototype's CSS custom properties |
| Server State | **TanStack Query** (caching, pagination, optimistic updates) |
| Auth State | **React Context** (`UserProvider`) |
| Image Export | **[html-to-image](https://github.com/bubkoo/html-to-image)** (client-side PNG via SVG foreignObject) |
| Platform | Web only (responsive) |

---

## Phase 1: Foundation (Week 1-2)

### Project Setup
- [x] Initialize Next.js project with TypeScript
- [x] Install and configure Tailwind CSS
- [x] Install Appwrite SDK (`appwrite`, `node-appwrite`)
- [x] Install TanStack Query (`@tanstack/react-query`)
- [x] Copy SVG assets from prototype to `public/assets/`

### Appwrite Setup
- [x] Create Appwrite project `runstats`
- [x] Create database `runstats_db`
- [x] Create collection `users` with all attributes and indexes
- [x] Create collection `goals` with all attributes and indexes
- [x] Create collection `activities` with all attributes and indexes
- [x] Create collection `milestones` with all attributes and indexes
- [x] Create collection `personal_records` with all attributes and indexes
- [x] Create storage bucket `avatars` (max 10MB, image/jpeg, image/png, image/webp)
- [x] Create storage bucket `exports` (max 5MB)
- [x] Set up document-level permissions on all collections

### Design System
- [x] Port `colors_and_type.css` to `globals.css` (CSS custom properties + keyframes)
- [x] Configure Tailwind with design tokens (colors, fonts, spacing, radii, shadows)
- [x] Set up Google Fonts (Bebas Neue, Inter, JetBrains Mono, Anton, Caveat, Permanent Marker)

### Primitive Components
- [x] Port `Button` component to TSX
- [x] Port `Pill` component to TSX
- [x] Port `Label` component to TSX
- [x] Port `ProgressBar` component to TSX
- [x] Port `ProgressRing` component to TSX
- [x] Port `Input` component to TSX
- [x] Port `Icon` component to TSX (all 30+ icon paths)
- [x] Port `CountUp` component to TSX

### Auth + Appwrite Client
- [x] Create `lib/appwrite/client.ts` (browser Appwrite client)
- [x] Create `lib/appwrite/server.ts` (server-side Appwrite client with admin key)
- [x] Create `lib/appwrite/collections.ts` (collection IDs, attribute constants)
- [x] Create `lib/strava/oauth.ts` (OAuth URL builder, token exchange)
- [x] Implement `GET /api/auth/strava` (redirect to Strava OAuth)
- [x] Implement `GET /api/auth/strava/callback` (exchange code, create user, set session)
- [x] Implement `POST /api/auth/logout` (destroy session)
- [x] Implement `GET /api/auth/me` (current user profile)
- [x] Create `UserProvider` context + `useUser` hook

### Core Layout
- [x] Port Chrome nav shell (`chrome.jsx` → `components/chrome/Chrome.tsx`)
- [x] Port landing/connect page (`connect.jsx` → `app/page.tsx`) with real Strava OAuth button
- [x] Set up `(app)/layout.tsx` with auth gate + Chrome nav

### Phase 1 Verification
- [x] Can log in via Strava, see Chrome nav, session persists on refresh

---

## Phase 2: Onboarding + Sync (Week 2-3)

### Onboarding Flow
- [x] Create `app/(auth)/onboarding/page.tsx`
- [x] Port Step 1: Photo upload with duotone preview (`PhotoUpload.tsx`, `DuotonePreview.tsx`)
- [x] Implement avatar upload to Appwrite Storage `avatars` bucket <!-- shared `media` bucket per LESSONS free-tier cap -->
- [x] Port Step 2: Goal setting (`GoalSetting.tsx`) — 4 built-in goals
- [x] Implement goal creation API: `POST /api/goals` (creates 4 default goals)
- [ ] Port Step 3: Auto-share preferences (`AutoSharePrefs.tsx`)
- [ ] Mark `onboardingComplete = true` on user document after step 3

### Strava Activity Sync
- [ ] Create `lib/strava/api.ts` (Strava API client with fetch wrapper)
- [ ] Create `lib/strava/tokenRefresh.ts` (check expiry, refresh if needed, update user doc)
- [x] Create `lib/utils/encryption.ts` (AES-256 encrypt/decrypt for Strava tokens) <!-- pulled forward in Phase 1 Auth PR; required by callback -->
- [ ] Implement `POST /api/strava/sync`:
  - [ ] Fetch last 90 days of Run/TrailRun/VirtualRun activities from Strava
  - [ ] Parse and store in `activities` collection (with bestEfforts, splitsMetric as JSON)
  - [ ] Deduplicate by `stravaActivityId`
  - [ ] Update `lastSyncAt` on user document
- [ ] Build sync progress UI (polling or Appwrite Realtime)

### Hooks
- [ ] Create `lib/hooks/useGoals.ts` (fetch goals for current year)
- [ ] Create `lib/hooks/useActivities.ts` (paginated activity list)

### Phase 2 Verification
- [ ] Onboarding completes, avatar visible, goals created in DB, activities synced from Strava

---

## Phase 3: Dashboard + Goals (Week 3-4)

### Dashboard
- [ ] Port dashboard layout (`dashboard.jsx` → `app/(app)/dashboard/page.tsx`)
- [ ] Volume hero section with CountUp animation + ProgressRing (wired to real ytd data)
- [ ] Goal cards row (4 built-in goals from `useGoals`)
- [ ] Milestone feed grid (placeholder until Phase 4 — show empty state)
- [ ] Recent runs list (from `useActivities`)
- [ ] "Log today's run" → manual re-sync button (`POST /api/strava/sync`)
- [ ] "Re-sync Strava" button
- [ ] Compute derived stats: volume %, pace projections, "on pace for" date

### Goals Editor
- [ ] Port goals screen (`GoalsScreen` in `dashboard.jsx` → `app/(app)/goals/page.tsx`)
- [ ] Implement `GET /api/goals` (list user's goals)
- [ ] Implement `PATCH /api/goals/[id]` (update target)
- [ ] Implement `DELETE /api/goals/[id]` (delete custom goals only)
- [ ] Inline editing mode for each goal card
- [ ] "Add a goal" modal with preset templates (Marathon, Ultra, Streak, etc.)
- [ ] Custom goal creation flow (name, distance, type, target)

### Phase 3 Verification
- [ ] Dashboard shows real volume/goals/runs, can edit goals

---

## Phase 4: Milestone Detection (Week 4-5)

### PR Tracking
- [ ] Create `lib/milestones/formatters.ts` (time formatting, pace calculation, seconds↔string)
- [ ] Implement personal_records upsert: on activity sync, read `bestEfforts` JSON, for any `pr_rank === 1` → upsert `personal_records` doc (store previous best for delta)

### Milestone Detection Engine
- [ ] Create `lib/milestones/detector.ts`:
  - [ ] PR detection: iterate `bestEfforts[]`, create `PR` milestone for any `pr_rank === 1`
  - [ ] Goal completion: compare `bestEfforts` against time goals, mark done if `moving_time <= targetSeconds`
  - [ ] Volume progress: fetch `ytd_run_totals` from Strava, compute % against volume goal, create `PROGRESS` milestone at step boundaries (1% or 5%)
  - [ ] Streak detection: query activities table for consecutive days, create `STREAK` milestone at thresholds (7, 10, 14, 21, 30, 50, 100)
  - [ ] Monthly threshold: sum activities for current month, create `THRESHOLD` milestone at 50/100/150/200/250/300 km crossings
- [ ] Create `lib/milestones/storyBuilder.ts`:
  - [ ] `buildPRStory()` — generates story data matching prototype's `m.story` shape
  - [ ] `buildGoalStory()` — goal completion story
  - [ ] `buildVolumeStory()` — volume progress story
  - [ ] `buildStreakStory()` — streak story
  - [ ] `buildThresholdStory()` — monthly threshold story

### Integration
- [ ] Wire milestone detection into `POST /api/strava/sync` (after activities stored)
- [ ] Backfill: run detection on all existing activities (oldest-first to build up personal_records)
- [ ] Implement `GET /api/milestones` (paginated, filterable by kind)
- [ ] Implement `GET /api/milestones/[id]` (single with full storyData)
- [ ] Implement `PATCH /api/milestones/[id]` (caption, template, shared flag)
- [ ] Create `lib/hooks/useMilestones.ts`
- [ ] Wire milestone feed on dashboard (6 cards, clickable)

### Phase 4 Verification
- [ ] After sync, milestones auto-detect (PR, volume, streak, etc.), story data matches prototype shape

---

## Phase 5: Strava Webhooks (Week 5-6)

### Webhook Endpoints
- [ ] Implement `GET /api/strava/webhook` (Strava validation — respond with `hub.challenge`)
- [ ] Implement `POST /api/strava/webhook` (event handler):
  - [ ] Validate subscription ID
  - [ ] Look up user by `stravaAthleteId`
  - [ ] On `create`/`update` + `activity`: refresh token → fetch DetailedActivity → store → detect milestones
  - [ ] On `delete` + `activity`: remove activity + associated milestones
  - [ ] Respond 200 within 2 seconds
- [ ] Register Strava webhook subscription via Strava API

### Appwrite Functions
- [ ] Create `functions/strava-webhook-handler/` (async activity processing if webhook route needs to return fast)
- [ ] Create `functions/strava-periodic-sync/` (CRON every 6 hours — fallback for missed webhooks)
- [ ] Implement Strava rate limit tracking (100 req/15min, 1000/day)

### Real-time Frontend
- [ ] Set up Appwrite Realtime subscription on `milestones` collection in dashboard
- [ ] When new milestone detected → show notification badge / toast
- [ ] Create `lib/hooks/useStrava.ts` (sync status, manual re-sync trigger)

### Phase 5 Verification
- [ ] Log a run on Strava → webhook fires → milestone appears on dashboard within ~30 seconds

---

## Phase 6: Templates + Share (Week 6-7)

### Template Components
- [ ] Port shared template components:
  - [ ] `Backdrop.tsx` (photo background with gradient overlay)
  - [ ] `YearProgress.tsx` (year goal progress bar)
  - [ ] `StatCard.tsx` (glassmorphic stat container)
  - [ ] `FootStrip.tsx` (logo + handle footer)
- [ ] Port 6 story templates:
  - [ ] `T1_AlmostThere.tsx` — script "Still on the WAY." + comparison + timeline
  - [ ] `T2_ClosingGap.tsx` — chunky display + vertical timeline rail
  - [ ] `T3_Consistency.tsx` — stat icons + sparkline chart
  - [ ] `T4_Streak.tsx` — flame + day counter + comparison row
  - [ ] `T5_Journey.tsx` — dotted route + waypoints
  - [ ] `T6_Unlocked.tsx` — hex badge + confetti + achievement
- [ ] Port `TemplateCard.tsx` dispatcher (variant picker, tone/accent mapping)
- [ ] Replace hardcoded `@alexkr` with dynamic user handle in all templates

### Share Composer
- [ ] Port share composer (`share.jsx` → `app/(app)/milestone/[id]/page.tsx`)
- [ ] 6-variant thumbnail picker
- [ ] Aspect ratio picker (1:1, 9:16, 16:9)
- [ ] Format picker (Image only at launch — Video/GIF disabled but UI present)
- [ ] Per-milestone image upload to Appwrite Storage
- [ ] Caption editor with copy-to-clipboard
- [ ] Animate toggle (count-up motion on preview)

### Image Export
- [ ] Install `html-to-image`
- [ ] Create `components/share/ImageExporter.tsx`:
  - [ ] Hidden off-screen render container at full export resolution
  - [ ] `toPng()` with font embedding via `fontEmbedCSS`
  - [ ] Download as PNG with proper filename
- [ ] Implement `POST /api/exports/save` (save PNG to Appwrite Storage)
- [ ] Share targets UI (Instagram, X, Link — launch as copy-image / download-and-post)

### Phase 6 Verification
- [ ] Click milestone → 6 templates render with real data → download PNG → file is a valid image matching the design

---

## Phase 7: Celebration + Polish (Week 7-8)

### Celebration Wheel
- [ ] Port celebration wheel (`celebration.jsx` → `components/celebration/Celebration.tsx`)
- [ ] Port WebAudio unlock sound (`unlockSound.ts`)
- [ ] Port phase choreography (rotate → settle → ignite → unlocked → showcase → exit)
- [ ] Port marquee ribbons, shard burst SVG, orbit ring
- [ ] Wire to real-time: when Appwrite Realtime detects new milestones → show celebration
- [ ] Multi-unlock queue support (if multiple milestones in same activity)
- [ ] "Make it shareable" CTA → navigate to share composer

### Weekly Recap
- [ ] Create `functions/weekly-recap-generator/` (CRON Sunday 7pm):
  - [ ] Aggregate week's activities (total km, count, avg pace, PR count)
  - [ ] Create `RECAP` milestone with story data
  - [ ] Only for users with `autoShareWeeklyRecap = true`

### Settings
- [ ] Create `app/(app)/settings/page.tsx`
- [ ] Accent color picker (6 presets + custom — port from `tweaks.jsx`)
- [ ] Persist accent color to user document
- [ ] Profile display (name, handle, city, connected Strava account)
- [ ] Disconnect Strava option

### Events Placeholder
- [ ] Port events screen (`EventsScreen` from `chrome.jsx` → `app/(app)/events/page.tsx`)

### Polish
- [ ] Responsive design pass (mobile breakpoints for dashboard, share composer, templates)
- [ ] Loading states (skeleton screens for dashboard, milestone feed)
- [ ] Empty states (no milestones yet, no activities, no goals)
- [ ] Error handling (API failures, Strava rate limits, network errors)
- [ ] Toast notifications for user actions (goal saved, image downloaded, sync complete)
- [ ] "Reset demo" dev button removed for production

### Phase 7 Verification
- [ ] New milestone triggers celebration wheel → transitions to share composer

---

## Phase 8: Deploy (Week 8-9)

### Deployment
- [ ] Configure Appwrite Sites for Next.js SSR deployment
- [ ] Set environment variables (Strava client ID/secret, Appwrite endpoint/project/API key, encryption key)
- [ ] Deploy to Appwrite Sites
- [ ] Configure custom domain (if applicable)
- [ ] Set up production Strava webhook callback URL
- [ ] Re-register Strava webhook subscription with production URL

### Testing
- [ ] E2E: full flow from Strava connect → onboarding → sync → dashboard → milestone → share → download
- [ ] Test image export across browsers (Chrome, Safari, Firefox)
- [ ] Test with real Strava account (log a run → verify milestone appears)
- [ ] Test Strava webhook delivery + processing
- [ ] Test token refresh flow (wait for token expiry, verify auto-refresh)
- [ ] Load test: verify 1000-user capacity (Appwrite limits, Strava rate limits)

### Monitoring
- [ ] Set up Appwrite function execution logs monitoring
- [ ] Set up error tracking (Sentry or similar)
- [ ] Monitor Strava API rate limit usage
- [ ] Set up uptime monitoring for webhook endpoint

### Phase 8 Verification
- [ ] Full flow works on production URL with real Strava account

---

## Database Schema Reference

<details>
<summary>Click to expand full schema</summary>

### `users`
| Attribute | Type | Notes |
|-----------|------|-------|
| `userId` | string(36) | = Appwrite Auth user ID = document ID |
| `name` | string(128) | Display name |
| `handle` | string(64) | e.g. `@alexkr` |
| `city` | string(128) | From Strava profile |
| `avatarFileId` | string(36) | Appwrite Storage file ID |
| `accentColor` | string(7) | Default `#FF6800` |
| `stravaAthleteId` | string(20) | **Unique index** |
| `stravaAccessToken` | string(256) | AES-256 encrypted |
| `stravaRefreshToken` | string(256) | AES-256 encrypted |
| `stravaTokenExpiresAt` | integer | Unix timestamp |
| `autoSharePR` | boolean | Default `true` |
| `autoShareVolume` | boolean | Default `true` |
| `autoShareWeeklyRecap` | boolean | Default `true` |
| `onboardingComplete` | boolean | Default `false` |
| `lastSyncAt` | datetime | |

### `goals`
| Attribute | Type | Notes |
|-----------|------|-------|
| `userId` | string(36) | Owner |
| `goalKey` | string(32) | `k5`, `k10`, `hm`, `volume`, or `c_xxxxx` |
| `name` | string(128) | "5K time" |
| `type` | string(16) | `time` / `volume` / `complete` / `count` |
| `distanceLabel` | string(64) | "5 km" |
| `targetValue` | string(32) | "22:00" or "1000" |
| `targetSeconds` | integer | For time goals |
| `currentValue` | string(32) | Current best |
| `currentSeconds` | integer | |
| `percentage` | integer | 0-100 |
| `done` | boolean | Default `false` |
| `doneAt` | datetime | |
| `year` | integer | 2026 |
| `isBuiltin` | boolean | |

### `activities`
| Attribute | Type | Notes |
|-----------|------|-------|
| `userId` | string(36) | Owner |
| `stravaActivityId` | string(20) | **Unique index** |
| `title` | string(256) | |
| `type` | string(32) | "Run", "Trail Run" |
| `date` | datetime | |
| `distanceMeters` | float | |
| `distanceKm` | float | Computed |
| `movingTimeSec` | integer | |
| `elapsedTimeSec` | integer | |
| `avgSpeedMps` | float | |
| `avgPaceSecPerKm` | integer | Computed |
| `maxSpeedMps` | float | |
| `avgHeartrate` | float | Optional |
| `maxHeartrate` | float | Optional |
| `elevationGainM` | float | |
| `calories` | float | Optional |
| `summaryPolyline` | string(4096) | |
| `prCount` | integer | From Strava |
| `achievementCount` | integer | From Strava |
| `bestEfforts` | string(8192) | JSON: Strava best_efforts[] |
| `splitsMetric` | string(8192) | JSON: Strava splits_metric[] |
| `processed` | boolean | Milestone detection done? |

### `milestones`
| Attribute | Type | Notes |
|-----------|------|-------|
| `userId` | string(36) | Owner |
| `kind` | string(16) | `PR`/`PROGRESS`/`GOAL`/`STREAK`/`THRESHOLD`/`RECAP` |
| `activityId` | string(36) | |
| `goalId` | string(36) | |
| `pillText` | string(64) | "NEW 5K PR" |
| `tone` | string(16) | `ignite`/`pulse`/`amber`/`cyan` |
| `bigValue` | string(32) | "21:49" |
| `bigSub` | string(64) | "minutes" |
| `deltaValue` | string(32) | "-26s" |
| `prevValue` | string(64) | |
| `subtitle` | string(128) | |
| `date` | datetime | |
| `context` | string(256) | |
| `caption` | string(512) | |
| `storyData` | string(4096) | JSON matching prototype `m.story` shape |
| `shared` | boolean | Default `false` |
| `imageFileId` | string(36) | |
| `selectedTemplate` | string(4) | t1-t6 |

### `personal_records`
| Attribute | Type | Notes |
|-----------|------|-------|
| `userId` | string(36) | |
| `distanceBucket` | string(16) | `5k`, `10k`, `hm`, `marathon` |
| `bestTimeSec` | integer | |
| `bestTimeFormatted` | string(16) | "21:49" |
| `activityId` | string(36) | |
| `achievedAt` | datetime | |
| `previousBestSec` | integer | For delta display |

</details>

---

## API Routes Reference

<details>
<summary>Click to expand full API design</summary>

**Auth:**
```
GET  /api/auth/strava          → Redirect to Strava OAuth
GET  /api/auth/strava/callback → Exchange code, create user, set session
POST /api/auth/logout          → Destroy session
GET  /api/auth/me              → Current user profile
```

**Strava:**
```
POST /api/strava/sync          → Manual re-sync activities
GET  /api/strava/webhook       → Strava webhook validation
POST /api/strava/webhook       → Webhook event handler
```

**Goals:**
```
GET    /api/goals              → List goals (current year)
POST   /api/goals              → Create goal
PATCH  /api/goals/[id]         → Update target
DELETE /api/goals/[id]         → Delete custom goal
```

**Activities:**
```
GET  /api/activities           → Paginated list
```

**Milestones:**
```
GET   /api/milestones          → Paginated feed
GET   /api/milestones/[id]     → Single with story data
PATCH /api/milestones/[id]     → Update caption/template/shared
```

**Export:**
```
POST /api/exports/save         → Save PNG to Storage
```

**Appwrite Functions:**
| Function | Trigger | Purpose |
|----------|---------|---------|
| `strava-webhook-handler` | HTTP | Async activity processing |
| `weekly-recap-generator` | CRON `0 19 * * 0` | Sunday 7pm recaps |
| `strava-periodic-sync` | CRON `0 */6 * * *` | Fallback sync |

</details>

---

## Milestone Detection Reference

<details>
<summary>Click to expand detection algorithm</summary>

### What Strava Provides (no need to compute)
- `best_efforts[]` per activity — times for 14 distances (400m → 50K), with `pr_rank` (1 = new PR)
- `ytd_run_totals.distance` — year-to-date volume
- `recent_run_totals` — last 4 weeks
- `pr_count`, `achievement_count`, `splits_metric[]`

### What We Compute
- Goal progress % (compare Strava data against user-defined targets)
- Streak days (consecutive days from activities table)
- Monthly thresholds (sum from activities table)
- Weekly recap (CRON aggregation)
- Story data objects for templates

### Detection Flow
1. **PR:** `best_efforts[].pr_rank === 1` → create `PR` milestone, upsert `personal_records`
2. **Goal:** compare `best_efforts` time against `goals.targetSeconds` → create `GOAL` milestone if beaten
3. **Volume:** `ytd_run_totals.distance / 1000` vs volume goal → create `PROGRESS` at 1%/5% steps
4. **Streak:** count consecutive days from activities → create `STREAK` at 7/10/14/21/30/50/100 thresholds
5. **Monthly:** sum month's km → create `THRESHOLD` at 50/100/150/200/250/300 crossings

### Story Data Shape (matches prototype)
```json
{
  "goalLabel": "5K GOAL", "target": "21:30", "current": "21:49",
  "best": "22:15", "startVal": "24:00", "gap": "0:19", "gapLabel": "AWAY",
  "improvement": "2:11", "unit": "min", "headlineNoun": "5K",
  "stages": [
    { "label": "JAN", "note": "Goal Set", "value": "24:00" },
    { "label": "MAR", "note": "Best", "value": "22:15" },
    { "label": "TODAY", "note": "", "value": "21:49", "active": true }
  ],
  "subline": "Every run. Every step. Every day."
}
```

</details>

---

## Prototype Reuse Reference

<details>
<summary>Click to expand reuse analysis</summary>

| Prototype File | Reuse | Strategy |
|---|---|---|
| `colors_and_type.css` | ~95% | Copy CSS vars, map to Tailwind config |
| `primitives.jsx` | ~90% | Port 8 components to TSX |
| `templates.jsx` | ~85% | Split into 6+4 files, keep pixel-perfect |
| `celebration.jsx` | ~80% | Port wheel + WebAudio, wire to real data |
| `share.jsx` | ~75% | Port layout, add html-to-image export |
| `chrome.jsx` | ~70% | Port nav, add real SyncStatus |
| `connect.jsx` | ~60% | Keep visual, replace fake sync with OAuth |
| `onboarding.jsx` | ~60% | Keep 3-step design, wire to Appwrite |
| `dashboard.jsx` | ~50% | Keep layout, replace mock data with hooks |
| `tweaks.jsx` | ~50% | Move to settings page |
| `data.jsx` | 0% code / 100% spec | Defines milestone shapes for detection |
| `assets/*.svg` | 100% | Copy to `public/assets/` |
| `index.html` keyframes | 100% | Copy all `@keyframes` to `globals.css` |

</details>

---

## Frontend Structure Reference

<details>
<summary>Click to expand directory structure</summary>

```
app/
  layout.tsx                    -- Root layout (fonts, globals, Appwrite provider)
  page.tsx                      -- Landing/connect page (public)
  globals.css                   -- Port of colors_and_type.css + keyframes
  (auth)/onboarding/page.tsx    -- 3-step onboarding
  (app)/
    layout.tsx                  -- Chrome nav shell (auth-gated)
    dashboard/page.tsx          -- Main dashboard
    goals/page.tsx              -- Goals editor
    milestones/page.tsx         -- Milestone feed
    milestone/[id]/page.tsx     -- Share composer
    events/page.tsx             -- Placeholder
    settings/page.tsx           -- Profile + accent color

components/
  primitives/                   -- Button, Pill, Label, ProgressBar, ProgressRing, Input, Icon, CountUp
  templates/                    -- T1-T6 + Backdrop, YearProgress, StatCard, FootStrip, TemplateCard
  celebration/                  -- Celebration wheel + unlockSound
  share/                        -- ShareComposer + ImageExporter
  chrome/                       -- Chrome nav + SyncStatus
  onboarding/                   -- PhotoUpload, GoalSetting, AutoSharePrefs, DuotonePreview

lib/
  appwrite/                     -- client.ts, server.ts, collections.ts
  strava/                       -- api.ts, oauth.ts, tokenRefresh.ts, webhook.ts
  milestones/                   -- detector.ts, storyBuilder.ts, formatters.ts
  hooks/                        -- useUser, useGoals, useActivities, useMilestones, useStrava
  utils/                        -- timeFormat.ts, encryption.ts, duotone.ts

public/assets/                  -- 7 SVGs from prototype
```

</details>
