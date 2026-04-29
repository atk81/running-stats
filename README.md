# RunStats

Turn your Strava runs into shareable milestone cards. Connect Strava, set goals, and every PR, streak, and volume milestone becomes a story-ready image you can post anywhere.

## What it does

1. **Connect Strava** — OAuth sync pulls your run history automatically
2. **Set goals** — 5K time, 10K time, half marathon, yearly volume, or custom targets
3. **Auto-detect milestones** — PRs, goal completions, streaks, volume thresholds, weekly recaps
4. **Generate shareable images** — 6 story templates (9:16), pick a style, download as PNG
5. **Celebrate** — cinematic unlock animation when you hit a milestone

## Milestone Types

| Type | Example | Trigger |
|------|---------|---------|
| **PR** | NEW 5K PR — 21:49 | Strava `best_efforts` with `pr_rank = 1` |
| **Goal** | 5K GOAL. DONE. | Beat your target time |
| **Volume** | VOLUME +1% | Year-to-date km crosses a % step |
| **Streak** | 10-RUN STREAK | Consecutive days with a run |
| **Threshold** | 100KM THIS MONTH | Monthly distance milestone |
| **Recap** | WEEK 16 — 42.3km | Weekly summary (auto Sunday 7pm) |

## Tech Stack

- **Frontend + API:** Next.js (App Router, TypeScript)
- **Backend:** Appwrite (Auth, Database, Storage, Functions)
- **Styling:** Tailwind CSS + custom design tokens
- **State:** TanStack Query + React Context
- **Image Export:** html-to-image (client-side PNG)
- **Deployment:** Appwrite Sites

## Getting Started

### Prerequisites

- Node.js 18+
- An [Appwrite](https://appwrite.io) project
- A [Strava API application](https://www.strava.com/settings/api) (client ID + secret)

### Setup

```bash
# Clone
git clone git@github.com:atk81/running-stats.git
cd running-stats

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Fill in your Appwrite and Strava credentials

# Run development server
npm run dev
```

### Environment Variables

```
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-api-key
STRAVA_CLIENT_ID=your-strava-client-id
STRAVA_CLIENT_SECRET=your-strava-client-secret
STRAVA_WEBHOOK_VERIFY_TOKEN=your-random-verify-token
ENCRYPTION_KEY=your-32-byte-hex-key
```

## Project Structure

```
app/
  page.tsx                      — Landing / Strava connect
  (auth)/onboarding/            — Photo upload, goals, preferences
  (app)/
    dashboard/                  — Volume hero, goal cards, run list
    goals/                      — Goal editor
    milestones/                 — Milestone feed
    milestone/[id]/             — Share composer + image export
    settings/                   — Accent color, profile
  api/
    auth/strava/                — OAuth flow
    strava/sync, webhook/       — Activity sync + webhooks
    goals/, activities/         — CRUD
    milestones/                 — Feed + detail
    exports/save                — PNG storage

components/
  primitives/                   — Button, Pill, ProgressBar, Icon, etc.
  templates/                    — 6 story templates (T1-T6)
  celebration/                  — Milestone unlock wheel
  share/                        — Share composer + image exporter

lib/
  appwrite/                     — Client setup + collection constants
  strava/                       — API client, OAuth, token refresh, webhooks
  milestones/                   — Detection engine + story data builder
  hooks/                        — useUser, useGoals, useActivities, useMilestones
```

## Story Templates

Six 9:16 vertical templates, each with a photo backdrop, year-progress bar, and milestone-specific content:

1. **Almost There** — handwritten script headline + comparison block + timeline
2. **Closing the Gap** — chunky display type + vertical timeline rail
3. **Consistency** — stat icons + sparkline chart
4. **Streak Mode** — flame animation + day counter
5. **The Journey** — dotted route with floating waypoint chips
6. **Goal Unlocked** — hex badge + confetti + achievement stamp

## License

MIT
