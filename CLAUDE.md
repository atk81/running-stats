# CLAUDE.md — Project Rules

## Git Workflow

### Branch Naming

Format: `<type>/<phase>-<short-description>`

Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`

Examples:
- `feat/p1-appwrite-setup`
- `feat/p1-strava-oauth`
- `feat/p2-onboarding-flow`
- `fix/p3-volume-calculation`
- `chore/p1-tailwind-config`

### Commit Messages

Format:
```
<type>(<scope>): <short summary>

<optional body — what and why, not how>
```

Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`

Scope: the area of the codebase — `auth`, `strava`, `dashboard`, `goals`, `milestones`, `templates`, `share`, `celebration`, `primitives`, `appwrite`, `config`

Examples:
- `feat(auth): implement Strava OAuth flow`
- `feat(milestones): add PR detection from Strava best_efforts`
- `fix(strava): handle expired token refresh race condition`
- `chore(config): add Tailwind design tokens from prototype`
- `refactor(templates): split T1-T6 into separate files`

Keep the summary under 72 characters. Use imperative mood ("add", not "added").

### Pull Requests

**Branch:** Always branch off `main`. One PR per logical feature/task.

**Title:** Same format as commit — `<type>(<scope>): <summary>`

**Body:**
```markdown
## Summary
- Bullet points of what changed and why

## Phase
Phase X — <phase name>

## Tasks Completed
- [x] task from plan.md
- [x] another task

## Test Plan
- [ ] How to verify this works
```

**Merge:** Squash merge into `main`. Delete branch after merge.

### When to Create a PR

- Each major section within a phase gets its own PR (e.g., "Auth + Appwrite Client" is one PR, "Primitive Components" is another)
- Don't bundle unrelated work
- Keep PRs reviewable — under ~500 lines when possible

## Code Conventions

- TypeScript strict mode
- React components: PascalCase files (e.g., `Button.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useGoals.ts`)
- Utilities: camelCase (e.g., `timeFormat.ts`)
- API routes: `route.ts` inside folder structure
- Appwrite collection/attribute IDs: snake_case
- CSS custom properties: kept from prototype (`--ignite`, `--ink`, `--bone`, etc.)

## Prototype Reference

The prototype lives in `runstats/` (gitignored). Read it for visual specs, component structure, and data shapes. Don't copy it verbatim — port to TypeScript with proper module exports.

## Plan Tracking

The implementation plan lives in `plan.md`. Update checkboxes as tasks are completed:
- `- [ ]` → `- [x]` when done
- Mark tasks in the PR that completes them
