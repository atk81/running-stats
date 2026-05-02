# Lessons Learned

> **READ BEFORE STARTING ANY TASK.** Single source of truth for non-obvious traps the pipeline has hit before. Append-only — never silently delete an entry.
>
> The `/next-task` pipeline reads this at Stage 0 and writes to it at Stage 4.5 whenever a section surfaces a non-obvious failure + recovery.

## How to add an entry

- 1–2 sentences max. Lead with the rule, then **Why** + **How to apply** + PR ref.
- Topical category, not chronological.
- Capture only what is **non-obvious from code or docs**. Skip "use TS strict" — Claude already knows.
- If a future PR proves an entry wrong → add the correction below it; don't rewrite history.

---

## Appwrite

- **Don't put `"format": "datetime"` on datetime attributes.** Appwrite rejects it: `format` is only valid on string subtypes (email/url/ip). Datetime is a top-level type. **Why:** PR #2 first push errored on this. **How to apply:** datetime attrs in `appwrite.json` only need `key`, `type: "datetime"`, `required`, `array`.
- **Never run `appwrite push tables` against a manifest that uses legacy `collections`/`databases` keys.** The new TablesDB CLI command reads `tables`/`tablesDB` only — sees an empty schema → diffs to "delete entire database". **Why:** PR #2 wiped runstats_db this way. **How to apply:** stay on `appwrite push collection` (deprecated but functional) until manifest is migrated to TablesDB schema. Decline ANY push diff that says `deleting Database`.
- **Appwrite Cloud Free tier caps: 1 database, 1 bucket, 2 functions per project.** **Why:** PR #2 had to merge `avatars` + `exports` buckets into a single `media` bucket. **How to apply:** if a feature wants a 2nd bucket/function/db, either upgrade plan or use filename/ID prefixes inside the single bucket (e.g. `avatar-{userId}.{ext}` vs `export-{milestoneId}.png`).
- **Appwrite row size cap = 65,535 bytes; utf8mb4 strings cost 4 bytes/char.** A `string(8192)` attribute consumes 32,768 bytes. Two of them + a `string(4096)` polyline = 81,920 bytes → exceeds cap. **Why:** PR #2 hit this on `activities.bestEfforts` + `splitsMetric`. **How to apply:** keep total of all string `size` × 4 under ~60K. For JSON blobs, default to size 4096; only go higher with a row-budget calc.
- **Appwrite project IDs are public, not secrets.** They appear in client SDK init + URLs. Safe to commit in `appwrite.json`. API keys and admin tokens are NOT — those go in `.env*` (gitignored).
- **`appwrite push collection` is interactive and has no `--all` flag.** For non-interactive scripted apply, call individual `appwrite databases create-X-attribute` / `create-index` commands per attr/index.

## GitHub / gh CLI

- **`gh pr edit --body` fails silently when the GraphQL response carries a Projects-classic deprecation warning.** The body never updates but no error code is returned. **Why:** PR #2 description couldn't be edited via `gh pr edit`. **How to apply:** use `jq -Rs '{body: .}' file.md | gh api -X PATCH "repos/$REPO/pulls/$N" --input -` instead. REST endpoint is unaffected.
- **`gh api -f body=@file` does NOT do file substitution.** Sets the body to the literal string `@file`. Use `--input` with stdin instead.

## Tooling / npm

- **`create-next-app .` rejects directory names with capital letters** ("npm naming restrictions"). **Why:** project root is `runStats/` (capital S). **How to apply:** scaffold to a temp dir first (`/tmp/<name>/runstats`), then copy files into the real project root. Skip `README.md`, `CLAUDE.md`, `.gitignore` — keep the project's existing ones, merge `.gitignore` manually.
- **Running ESLint at the repo root scans `runstats/` prototype files** and floods the report with errors from non-production code. **How to apply:** add `runstats/**` to `globalIgnores([...])` in `eslint.config.mjs`.

## Pipeline / workflow

- **`plan.md` schema-reference tables can drift from reality during deployment.** When IaC apply forces a schema change (e.g. row-size shrinks), do NOT silently edit `plan.md` outside Stage 4 — flag the drift in the PR description and reconcile in the downstream phase that ports schema to code (e.g. `lib/appwrite/collections.ts`).
- **No CI workflows configured yet → `gh pr checks` reports `no checks reported on the 'main' branch`.** Treated as green. Once GitHub Actions are added, Stage 6 `--watch` will block as designed.
- **When `plan.md` description and prototype source disagree, the prototype wins.** Plan text is intent; the prototype's CSS/JSX is the actually-tested implementation. **Why:** PR #4 task said "Bebas Neue, Inter, JetBrains Mono, Anton, Caveat, Permanent Marker" but prototype CSS actually used Bebas Neue + Archivo Narrow + Space Grotesk + Inter + JetBrains Mono. Prototype's 5 are load-bearing for the design; plan's extras (Anton, Caveat, Permanent Marker) are template-decorative. **How to apply:** before any frontend port, read the prototype CSS/JSX first; treat plan.md's font/component lists as a "must include at least these" floor, not the exact set. Load the union and flag the drift in the PR.

## Next.js 16

- **Next.js 16 has breaking API changes vs training-data-era Next.js.** The scaffold's `AGENTS.md` flags this explicitly. **How to apply:** before writing or porting any Next.js component, page, or route, check `node_modules/next/dist/docs/` for the relevant guide. Don't trust prior knowledge of `app/` conventions blindly.

## React 19 / ESLint

- **`react-hooks/set-state-in-effect` lint rule blocks synchronous `setState()` inside `useEffect` body.** Even an early-out like `if (cond) { setVal(0); return; }` fails. **Why:** PR #5 hit this when adding a `to === 0` early-out to `CountUp`. **How to apply:** if you need to seed state from an effect, either (a) defer via `requestAnimationFrame(() => setVal(x))` (the rAF callback is allowed), (b) move the `setVal` into the loop/callback path the effect already schedules, or (c) skip the optimization. Synchronous `setVal` inside the effect body itself is a hard-fail under `eslint-config-next` v16.

---

## Reverted / outdated entries

_(Move entries here when they're disproven. Don't delete — keep the trail.)_
