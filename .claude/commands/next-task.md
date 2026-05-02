---
name: next-task
description: "Autonomous: pick the next unchecked section from plan.md, run the right Spartan workflow, open PR, wait for CI, merge, update plan, report."
argument-hint: "[optional: section name to force, e.g. 'Appwrite Setup'] [--auto]"
---

# Next Task: {{ args[0] | default: "auto-pick from plan.md" }}

You are the **runStats pipeline driver**. End-to-end execution from `plan.md` to merged PR — no human intervention except gates that explicitly require it.

`--auto` flag (or "auto on" already set) → skip confirmations, run straight through. Still STOP for: failing CI, merge conflicts, secrets in diff, destructive ops (force push, branch delete on main).

---

## Stage 0 — Sanity check + load lessons

**MUST happen before anything else:**

1. **Read `.claude/LESSONS.md` end to end.** This file captures non-obvious traps prior runs hit (Appwrite quirks, gh CLI bugs, free-tier caps, etc.). Apply every relevant entry. Skipping this re-burns time on solved problems.

2. Sanity-check git + auth:

```bash
git status
git branch --show-current
git fetch origin
gh auth status
```

**Stop conditions:**
- `.claude/LESSONS.md` missing → STOP. Tell user; the file is required.
- Uncommitted changes on `main` → ask user to commit/stash first.
- Not on `main` → ask: continue current branch or switch to main?
- `gh` not authed → ask user to run `gh auth login` (use `! gh auth login` syntax).

---

## Stage 1 — Pick the section

Read `plan.md`. The unit of work is **one `###` subsection** (e.g. "Project Setup", "Appwrite Setup", "Primitive Components") because per `CLAUDE.md`: *each major section within a phase gets its own PR*.

If `args[0]` is set → find that section by exact heading match.
Otherwise → walk top-to-bottom and pick the **first `###` section that has any `- [ ]` task**. Skip Phase Verification subsections (those run after the section's tasks, not as their own PR).

Output to user:
```
Selected: Phase 1 → Project Setup (5 unchecked tasks)
Branch: feat/p1-project-setup
Workflow: scaffolding (no spec needed)
```

If `--auto` not set → confirm before proceeding.

---

## Stage 2 — Classify + route

Use the `plan-task-router` subagent to classify the section and return the workflow chain. Pass the section's heading + bullets as input. The router returns one of:

| Class | Workflow chain |
|-------|----------------|
| `scaffold` | Direct execution. Setup, configs, asset copies. No spec/plan. |
| `backend-feature` | `/spartan:spec` → `/spartan:plan` → `/spartan:build backend` |
| `frontend-port` | Check `.planning/design/system/tokens.md` exists. If not, port `colors_and_type.css` first. Then direct TSX port with TDD per component. |
| `frontend-feature` | `/spartan:spec` → `/spartan:ux prototype` → `/spartan:plan` → `/spartan:build frontend` |
| `fullstack` | `/spartan:spec` → `/spartan:ux prototype` → `/spartan:plan` → `/spartan:build` (auto-detect) |
| `infra` | `/spartan:spec` → execute. Appwrite project/collection/bucket setup. |
| `deploy` | `/spartan:spec` → manual checklist execution. Always require user confirmation per step. |

Subagents that MUST be triggered for the right class (the Spartan commands above already wire these — do NOT call them directly):
- `ai-designer` + `design-critic` → all `frontend-feature` (Design Gate)
- `phase-reviewer` → every `*-feature` and `fullstack` (Gate 3.5)
- `research-planner` → only if router flags "needs research" (e.g. Appwrite or Strava API choices not yet documented)

---

## Stage 3 — Branch + execute

```bash
# Branch name from CLAUDE.md convention: <type>/<phase>-<short-desc>
# type: feat (default) / chore (setup/config) / refactor / docs / test
git checkout -b <type>/p<phase-num>-<kebab-section-name>
```

Run the workflow chain from Stage 2. Honor every gate the Spartan commands enforce — do not skip Office Hours, Design Gate, or Gate 3.5.

Per `CLAUDE.md`:
- Commits: `<type>(<scope>): <imperative summary>` under 72 chars
- Scopes: `auth`, `strava`, `dashboard`, `goals`, `milestones`, `templates`, `share`, `celebration`, `primitives`, `appwrite`, `config`
- One commit per logical task — not one per section

Run `yarn build` (or `npm run build`) after any `.tsx`/`.ts` change per `.claude/rules/frontend-react/FRONTEND.md`. Fix all TS errors before proceeding.

---

## Stage 4 — Update plan.md

Before opening the PR, flip the section's `- [ ]` → `- [x]` for every task you actually completed. Don't tick incomplete items. Commit:

```
docs(plan): mark <section name> tasks as done
```

---

## Stage 4.5 — Capture lessons (gate before Stage 5)

Ask explicitly: did this section surface any **non-obvious** failure + recovery worth saving for future runs? Examples that qualify:

- A tool returned a misleading error message and the real cause was elsewhere.
- A tier limit / row size / API quirk we didn't expect.
- A CLI flag that doesn't behave as documented.
- A schema/format mismatch between two layers (e.g. CLI manifest vs server validator).

Examples that do NOT qualify (skip):

- Plain bug fixes already captured in commit messages.
- Things obvious from reading the code or vendor docs.
- One-off typos.

If yes → append a topical entry to `.claude/LESSONS.md` following the file's "How to add an entry" rules (lead with the rule, then **Why** + **How to apply** + PR ref). Commit:

```
docs(lessons): capture <topic> learning from <section>
```

If no → skip. Do NOT pad the file.

---

## Stage 5 — PR

Run `/spartan:pr-ready`. It handles rebase, lint, type-check, test, security scan, PR description, and `gh pr create`.

PR title format: `<type>(<scope>): <section name>` (matches commit format).

PR body MUST include the "Phase X — <name>" line and a checked task list copied from the section. Use the body template in `CLAUDE.md`.

---

## Stage 6 — Watch CI

```bash
PR_NUM=$(gh pr view --json number -q .number)
gh pr checks $PR_NUM --watch --interval 30
```

`--watch` blocks until all required checks finish. Three outcomes:

| Outcome | Action |
|---------|--------|
| All green | Continue to Stage 7 |
| Any failed | Read failed check logs (`gh run view <id> --log-failed`), classify: lint/test/build → fix and push; infra/flake → ask user; reset to in_progress in TaskList |
| Pending > 20 min | Notify user, save state, exit (don't busy-wait) |

---

## Stage 7 — Merge

Only on green CI:

```bash
gh pr merge $PR_NUM --squash --delete-branch
git checkout main
git pull --ff-only origin main
```

If `--auto` not set → confirm before merge. If `--auto` is set → merge directly but log loudly: `→ MERGED PR #N to main`.

**Never** force-push or merge over a failing check. Never `--no-verify`.

---

## Stage 8 — Summary report

Output to user (and save to `.handoff/last-task.md`):

```markdown
# Section complete: <Phase X> → <Section Name>

**PR:** #N — <url>
**Branch:** <branch> (deleted)
**Commits:** N
**Files changed:** N
**Tests:** <added / passed>
**CI:** all green (<duration>)

## What shipped
- <bullet per task completed>

## Skills + agents used
- <list>

## Lessons added
- <list of new entries appended to .claude/LESSONS.md, or "none — section ran clean">

## Next up
- <next unchecked section from plan.md, or "all sections complete">

## Anything that needs your attention
- <e.g. env vars to add, secrets to rotate, manual Appwrite console steps>
```

---

## Hard rules

- **Never** start work without first reading `.claude/LESSONS.md` (Stage 0). Skipping it re-burns time on already-solved traps.
- **Never** modify `plan.md` outside Stage 4.
- **Never** commit secrets (`.env`, API keys, Appwrite admin keys). Scan diffs at Stage 5.
- **Never** skip the section's "Phase Verification" sub-bullet — surface it to the user as a manual smoke-test step in the summary.
- **Never** run two sections' work in the same branch. One section = one PR.
- **Never** silently delete or rewrite a `LESSONS.md` entry. If proven wrong, append a correction below the original — keep the trail.
- If you hit any "wait, this is unclear" — STOP, name what's unclear, present 2-3 options, wait. (Per `CLAUDE.md` → Intellectual Honesty.)

## When to stop the run mid-flight

| Signal | Action |
|--------|--------|
| Office Hours questions revealed wrong-feature risk | Stop. Surface to user. |
| Design Gate rejected by `design-critic` 2+ times | Stop. Ask for direction. |
| Phase Reviewer hard-blocks | Stop. Address feedback before proceeding. |
| Secret detected in diff | Stop. Do NOT push. |
| CI red after 1 fix attempt | Stop. Hand back to user. |
| Merge conflict on rebase | Stop. Hand back to user. |
