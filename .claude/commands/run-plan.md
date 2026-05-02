---
name: run-plan
description: "Loop /next-task until plan.md is fully checked off (or until a stop condition fires). Use when you want to walk away."
argument-hint: "[--auto] [--max=N to cap section count] [--phase=N to limit to one phase]"
---

# Run Plan: walk plan.md to completion

You are running an **unattended pipeline**. Each iteration calls `/next-task` (which picks one section, runs the workflow, opens PR, watches CI, merges, and updates plan.md). After each successful iteration, loop again. Stop on the conditions listed below.

---

## Stage 0 — Pre-flight

```bash
git status
git branch --show-current
gh auth status
```

- Must be on `main` with a clean tree.
- `gh` must be authed.
- `plan.md` must exist with at least one `- [ ]` task.

If any pre-flight fails → STOP and surface to user.

---

## Stage 1 — The loop

```
while plan.md has unchecked sections:
  if --max reached → stop
  if --phase set and next section is past that phase → stop
  call /next-task <flags>
  if /next-task exited with stop signal → stop, surface reason
  pull latest main
  continue
```

Between iterations:
- `git checkout main && git pull --ff-only origin main`
- Re-read `plan.md` to confirm previous iteration ticked the boxes
- Run `TaskList` to confirm no orphaned in_progress tasks (clean them up)

---

## Stage 2 — Stop conditions (any one ends the loop)

| Signal | Action |
|--------|--------|
| `plan.md` has no unchecked tasks | Loop done — write final report |
| `--max=N` reached | Pause. Write progress report. |
| `/next-task` returned a stop signal (CI failed, conflict, secret, etc.) | Stop loudly. Surface the failed PR + last good commit. |
| `--phase=N` set and next section is in phase N+1 | Pause. Wait for user to confirm continuing. |
| 2 consecutive sections required user input | Pause — likely systemic blocker. |
| Disk/quota/rate-limit error from `gh` or Appwrite | Stop. Wait for user. |
| Context usage > 60% (per `CLAUDE.md` Context Hygiene) | `/spartan:context-save` then exit cleanly. |

---

## Stage 3 — Final report

Write to `.handoff/run-plan-report.md` AND output to user:

```markdown
# Run Plan complete (or paused)

**Started:** <ISO timestamp>
**Ended:** <ISO timestamp>
**Reason:** <done | --max reached | stop signal: ...>

## Sections shipped (N)
- ✅ Phase 1 → Project Setup → PR #12
- ✅ Phase 1 → Appwrite Setup → PR #13
- ...

## Sections skipped or paused
- ⏸ Phase 2 → Strava Activity Sync — blocked: needs `STRAVA_CLIENT_SECRET` env var

## Plan progress
- Done: 23 of 187 tasks (12%)
- Phase 1: 100% · Phase 2: 40% · Phase 3-8: 0%

## Manual steps queued for you
- <bullet per "Phase Verification" item from completed sections>
- <bullet per "needs your attention" item from /next-task summaries>

## Next call
Run `/run-plan` again after handling the manual steps above.
```

---

## Hard rules

- **Never** run two `/next-task` instances at once from this command. Sequential only. (Parallel waves are `/spartan:team`'s job, not this one.)
- **Never** retry a failed `/next-task` automatically. The user decides whether to retry, fix, or skip.
- **Never** edit `plan.md` directly from this command — only `/next-task` Stage 4 does that.
- If `--auto` is NOT set, prompt user before each new section. The whole point of this command IS unattended runs, so the default is `--auto on`. Document it loudly in your first output: "Running unattended. Stop me anytime with Ctrl-C."
