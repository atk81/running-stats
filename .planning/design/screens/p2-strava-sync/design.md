# Screen Design: Strava Sync Progress Panel

**Date**: 2026-05-05
**Status**: approved
**Designer**: Claude (main agent)
**Critic**: design-critic agent
**Verdict**: ACCEPT (round 2 — round 1 issued NEEDS CHANGES on 6 findings, all addressed)
**AI Generic Score**: 8/10
**Carry-overs to PR description**:
- Prototype error caption is illustrative — implementation must use the doc's error message map (Section "Error message map") as the canonical source.
- Design doc's full error-state card supersedes the spec's older mention of `<FieldError />` as the error surface.
**AI Assets**: no
**Spec**: `.planning/specs/p2-strava-sync.md`

## Scope

ONE inline status panel inside existing `OnboardingStep` shell, three states: **loading**, **success**, **error**.
Replaces Step 3's footer button area during onboarding finalize after the user clicks "Open dashboard". Not a new screen — reuses the same shell and step heading.

## Why this isn't a new screen

The user already has visual context from Step 3 (auto-share preferences card, "Open dashboard" CTA they just clicked). Bouncing them to a new route or full-page spinner would feel disorienting. The panel is an in-place state swap inside the existing `<OnboardingStep>` body, so the heading "Auto-share?" stays visible while sync runs underneath. Once sync completes, route to `/dashboard`.

## Visual language reuse

Panel matches `AutoSharePrefs` card pattern so the transition feels like a content swap, not a context shift:

- Background: `var(--surface)` (white)
- Border: `1px solid var(--border)` (`--bone-3`)
- Radius: 16px (`--r-4`)
- Padding: 20px (`--sp-5`)
- Shadow: none in default; `--sh-ignite` glow only on active loading dot

Typography:
- Headline: `var(--font-heading)` (Archivo Narrow), 24-28px, weight 600, ink color
- Subtext: `var(--font-body)` (Inter), 14px, `--fg-3` (`#5A6068`)
- Live count: `var(--font-mono)` (JetBrains Mono), 14px, `--fg-2`, tabular-nums

Motion: reuse existing keyframes from `globals.css` — no new animations needed.

## State 1: Loading

```
+------------------------------------------------+
|                                                |
|   ●─────────────────                            |
|   PULLING YOUR RUNS FROM STRAVA…                |
|                                                |
|   ████████████████░░░░░░░░░░  shimmer overlay   |
|                                                |
|   We're grabbing your last year of activity.   |
|                                                |
|   42 synced  •  1.2s elapsed                    |
|                                                |
+------------------------------------------------+
```

### Composition

| Element | Token / Style | Behavior |
|---|---|---|
| Eyebrow row | `t-eyebrow` class — uppercase 12px, letter-spacing 0.08em, `--fg-3` | Static text "STRAVA SYNC" |
| Pulsing dot | 10px circle, `--ignite`, `rs-pulse-dot` keyframe | Loops while loading |
| Headline | h3 (Archivo Narrow 24px), `--ink` | "Pulling your runs from Strava…" |
| Progress bar | 4px track, `--bone-2` background, fill `--ignite`, `rs-bar-grow` from 0% to 100% over 8s, `forwards` fill-mode so it stays at 100% | Shimmer overlay (separate child element) loops via `rs-shimmer` continuously — keeps the bar feeling alive even after the fill reaches 100% |
| Caption | 14px Inter, `--fg-3`, max-width 460px | "We're grabbing your last year of activity. Usually 5-10 seconds." |
| Elapsed counter | 14px JetBrains Mono, `--fg-2`, tabular-nums | "{elapsed}s elapsed" — driven by local `setInterval(1000)`; no per-second polling against the API. Synced count surfaces only on success state. |

The progress bar is **indeterminate-looking** (8s loop) but actually time-based — we don't know the exact count up front, so the bar reaches 100% at roughly the same time the panel transitions to Success. If sync takes longer, the bar stays at 100% (via `animation-fill-mode: forwards` on `rs-bar-grow`) and the **shimmer overlay** (a separate absolutely-positioned child driven by `rs-shimmer`) keeps looping — that's what keeps it feeling alive without lying about progress. We do NOT use a separate post-grow pulse keyframe.

### Accessibility

- `role="status"` `aria-live="polite"` on the panel root so screen readers announce state changes
- `aria-label="Strava sync in progress"` on the progress bar
- Reduced motion: `@media (prefers-reduced-motion)` already in `globals.css` kills all keyframes; bar shows as static 50% fill, dot stops pulsing — still readable

## State 2: Success (transient — 600ms before redirect)

```
+------------------------------------------------+
|                                                |
|   ✓ SYNCED                                      |
|                                                |
|   42 runs are ready.                            |
|                                                |
|   Heading to your dashboard…                    |
|                                                |
+------------------------------------------------+
```

### Composition

| Element | Token / Style | Behavior |
|---|---|---|
| Eyebrow with check | `t-eyebrow` + 32px circular bubble bg `--pulse-soft` containing `Icon` primitive `check` at 16px in `--pulse-deep` color | `rs-spring` keyframe on the bubble |
| Headline | h3 Archivo Narrow 24px, `--ink` | "{count} runs are ready." (singular: "1 run is ready.") |
| Caption | 14px Inter, `--fg-3` | "Heading to your dashboard…" |

Animation: `rs-spring` keyframe on the check icon (scale-in pop), `rs-fade-in` on the rest. Then 600ms hold, then `router.push('/dashboard')`.

If user has 0 runs (edge case from spec — empty year): headline reads **"You're all set."** caption reads **"No runs to import yet — log one on Strava and we'll catch it."**

## State 3: Error

```
+------------------------------------------------+
|                                                |
|   ⚠ STRAVA SYNC                                 |
|                                                |
|   Sync hit a snag.                              |
|                                                |
|   {friendly message}                            |
|                                                |
|                                                |
|   [ Try again ]    [ Skip for now ]             |
|                                                |
+------------------------------------------------+
```

### Composition

| Element | Token / Style | Behavior |
|---|---|---|
| Eyebrow with warn icon | `t-eyebrow` + **inline SVG only** (the `Icon` primitive does not have a `warning` glyph; do NOT use `<Icon name="warning" />` — it would silently fall back to the default icon). 14px triangle SVG inline in JSX, color `--ignite` (NOT red — keeps brand) | Static |
| Headline | h3 Archivo Narrow 24px, `--ink` | "Sync hit a snag." |
| Caption | 14px Inter, `--fg-2`, max-width 460px | Mapped from error code (table below) |
| Primary button | `<Button variant="primary">` — existing primitive only. **Do NOT re-implement the prototype's `.btn` class.** | Re-fires `POST /api/strava/sync` |
| Ghost button | `<Button variant="ghostLight">` — existing primitive only. | Routes to `/dashboard` anyway (sync available later) |

### Error message map

| Error code | Caption |
|---|---|
| `strava_auth_failed` | "Your Strava connection expired. Reconnect on the dashboard." (Try again hidden, Skip becomes "Open dashboard") |
| `strava_rate_limited` | "Strava's busy right now. We'll retry from your dashboard in a few minutes." |
| `sync_in_progress` | "Sync is already running. Heading to your dashboard…" (auto-route, no buttons) |
| `sync_failed` (generic) | "Something went wrong. Try once more, or skip and pull this in from your dashboard." |
| network / unknown | "Couldn't reach Strava. Check your connection and try again." |

## Why this passes the anti-AI-generic rules

1. **Not generic purple gradient.** Uses brand ignite orange consistently (loading bar, dot, primary button). Pulse green appears only on success, scoped to the check icon.
2. **Real, specific copy.** "Pulling your runs from Strava…" not "Loading your data". "{n} runs are ready." not "Sync complete!". "Sync hit a snag." not "An error occurred".
3. **Clear hierarchy.** Eyebrow → headline → caption → action. Same vertical rhythm in all 3 states so the swap feels like content morphing, not three different cards.
4. **No icon overload.** One small inline icon per state. No decorative iconography on the loading state.
5. **Honest progress.** Bar is time-based, not fake. Live count of synced rows is real data from polling.
6. **Brand consistency.** Same surface card as `AutoSharePrefs` directly above. No glassmorphism, no blob backgrounds, no neon.

## Responsive

| Breakpoint | Behavior |
|---|---|
| 375px (mobile) | Card width 100% with 16px outer gutter (already on `OnboardingClient`'s shell). Buttons stack vertically in error state, "Try again" first. |
| 768px (tablet) | Same as mobile up to ~600px width — the existing `max-w-[920px]` shell takes over. |
| 1440px (desktop) | Card constrained inside the `mx-auto max-w-[920px]` shell. Buttons inline-end in error state. |

## Edge cases covered

- **0 runs imported** → success state copy swaps to "You're all set." (see State 2)
- **Sync exceeds 8s timer** → progress bar pegs at 100% with shimmer continuing, no failure shown (truth: sync still running)
- **Sync takes 30s+ (rare)** → DEFERRED. A "This is taking longer than usual…" caption variant after a 15s `setTimeout` is desirable but out of scope for Phase 2. Without it, the user sees the same loading copy until success/error fires. Capture as a Phase 3 polish task.
- **Reduced motion preference** → keyframes neutralized by existing `@media (prefers-reduced-motion)` block
- **Single run sync** → "1 run is ready." (singular grammar handled in copy)
- **User clicks browser back during sync** → not blocked. Sync continues server-side; user sees outdated onboarding screen if they return; routing to `/dashboard` should detect `onboardingComplete=true` and route them forward (existing logic).

## Implementation notes (handoff hints)

- Lives inline inside `OnboardingClient.tsx`, not a new component file. The Step 3 body conditionally renders `<AutoSharePrefs>` vs `<SyncStatusInline>` based on a local `syncing` state.
- Live count comes from `POST /api/strava/sync` returning `synced` count on completion. Phase 2 keeps the loading copy minimal — show only the headline + an elapsed-seconds counter (`useEffect` + `setInterval(1000)`). The "{n} synced" piece only appears on success state, not during loading. Skip per-second polling.
- All required keyframes (`rs-fade-in`, `rs-pulse-dot`, `rs-shimmer`, `rs-spring`, `rs-bar-grow`) exist in `globals.css`. No new keyframes added.
- **`rs-pulse-dot` color override**: the global definition in `globals.css` line 301 uses `rgba(255,255,255,0.55)` (white glow, intended for dark surfaces). On the white sync-card surface that glow is invisible. Production CSS must redeclare the keyframe scoped to the panel's selector, e.g.:
  ```css
  /* in OnboardingClient.tsx via `<style jsx>` or a colocated module — NOT globals.css */
  @keyframes rs-pulse-dot-ignite {
    0% { box-shadow: 0 0 0 0 rgba(255, 104, 0, 0.55); }
    70% { box-shadow: 0 0 0 14px rgba(255, 104, 0, 0); }
    100% { box-shadow: 0 0 0 0 rgba(255, 104, 0, 0); }
  }
  .sync-pulse-dot { animation: rs-pulse-dot-ignite 1.6s var(--ease-out) infinite; }
  ```
- **No `Icon` primitive for the warning glyph.** Use an inline 14px triangle SVG inside the eyebrow JSX (the prototype's exact SVG path is the canonical source). Adding `"warning"` to the `Icon` primitive is out of scope for this PR — only the sync panel needs it.
- **Use the existing `<Button>` primitive** for "Try again" + "Skip for now" — do NOT copy the prototype's `.btn` class. The prototype's `.btn` is preview-only and lacks `:focus-visible`. (Note: the existing `<Button>` primitive itself has no explicit `:focus-visible` ring — that is a pre-existing app-wide a11y gap, not specific to this PR. Capture it for a future a11y pass.)
- The pulse-dot's glow comes from the keyframe `box-shadow` itself, not from a static `box-shadow: var(--sh-ignite)` property. Do NOT add a redundant static shadow.
- 768px tablet: no layout change — the same `max-w-[920px]` shell handles the gap between mobile and desktop. Buttons in the error state stay inline-end whenever the card width allows (~ ≥ 520px).

## Token reference

| Surface | Token |
|---|---|
| Card bg | `--surface` |
| Card border | `--border` (1px) |
| Card radius | `--r-4` (16px) |
| Card padding | `--sp-5` (20px) |
| Headline | h3 class — `--font-heading`, `--fs-h3`, `--ink` |
| Caption | `t-body-sm` — `--font-body`, `--fs-body-sm`, `--fg-3` |
| Eyebrow | `t-eyebrow` — `--fs-caption`, weight 600, `--ls-caps`, uppercase, `--fg-3` |
| Mono count | `t-mono` `t-data` — `--font-mono`, tabular-nums, `--fg-2` |
| Progress fill | `--ignite` |
| Progress track | `--bone-2` |
| Pulse dot fill | `--ignite` |
| Pulse dot glow | comes from keyframe `box-shadow` (locally re-declared `rs-pulse-dot-ignite` — see Implementation notes); no static `box-shadow` property on the dot itself |
| Success bubble bg | `--pulse-soft` (#CCFFE6) |
| Success bubble fg | `--pulse-deep` (#00B85C) |
| Error icon | `--ignite` (deliberate brand reuse — no separate red) |
