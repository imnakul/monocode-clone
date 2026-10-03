# Working agreement — the rules for this repo

Read this file fully once per session. It is short on purpose. For anything else,
use the docs map in `AGENTS.md` and open only what the task needs: search large
files by keyword instead of reading them whole.

`docs/` is tracked on the Windows branches (`nakul/windows-support*`). It is fork
material: never include it in an upstream pull request.

## Upstream-friendly by construction (most important)

- Small, one-thing PRs with what/why; UI changes carry before/after screenshots. Follow
  `.github/pull_request_template.md`.
- No new providers (the maintainer closes them). Product-direction moves start as an
  *issue* first.
- Big local stacks never go up wholesale — they are rebased into small review-ready PRs
  later. Keep every change upstream-compatible by construction (definition below).

### How we describe this approach (use verbatim externally)

> Upstream-compatible by construction: every change is platform-gated, regression-free on
> all supported targets, independently testable, and documented — so any slice of the fork
> lifts cleanly into a small, review-ready upstream PR at any time.

One-line version: **merge-clean by design.**

## How much process a task needs

Pick the tier first. When unsure, pick the smaller one and say so.

| Tier | Examples | Spec | Records | Tests |
|---|---|---|---|---|
| **Small** | bug fix, style tweak, rename, one-component change, docs | None | One short changelog entry | Targeted tests while working; full web suite once before commit |
| **Medium** | new option, new component, change touching several files or one data shape | Short spec, ≤150 lines: goal, plan, files, risks, checklist | Changelog entry; spec row in `docs/specs/SPECS.md` | Same as Small, plus new tests for new behaviour |
| **Large** | new feature area, storage/schema or protocol change, provider work, upstream merge | Full spec (lifecycle below) | Changelog entry; spec row; `LOCAL-FEATURES.md` row | Full gates (below) |

Every tier: add or update a `docs/LOCAL-FEATURES.md` row when a user-visible behaviour
is added, changed or removed (it is the record of what this fork has that upstream does not).

## Quality gates

- Strict TypeScript: no `any`, explicit return types. Tailwind utility classes only — no
  inline styles, CSS modules or custom CSS unless Tailwind cannot do it.
- Pure functions with unit tests beside them (protocol/scanner style). New behaviour gets
  new tests in the same format.
- **While working:** run the tests for the files you touch (`npx vitest run <paths>`) and
  `npx tsc --noEmit`.
- **Before every commit:** `npx tsc --noEmit` clean and the full `npx vitest run` green.
- **Rust:** only when Rust changed: `cargo fmt --check` and `cargo check` (Clippy and
  `cargo test` for Large tasks or when the change is risky).
- **Large tasks and upstream merges:** the full upstream bar, `npm run check`.
- Pre-existing failures stay documented, never silently "fixed" with unrelated churn
  (see the Windows CRLF family in `docs/WINDOWS-CHANGES.md`). Attribute every failing test
  (ours vs pre-existing vs incomplete work) before touching it. If unsure, stop and ask.

## Windows-platform rules

- All Windows code behind `#[cfg(windows)]` — Unix paths and tests untouched, macOS/Linux
  never regress.
- No spawned consoles: every child hidden or supervised; scanners do pure file reads, zero
  spawns. No shell-string concatenation.
- No hardcoded usernames/paths — derive from `USERPROFILE`/`APPDATA`/`PATH`/registry.
  Durability over cleverness: PATH/PATHEXT/registry discovery survives upgrades; internal
  helper exes (sandbox-bin, MSIX) stay excluded.
- Backend is authoritative — the frontend never declares health, only renders probe
  results. No fake capabilities: fail loudly with clear messages.
- Don't strand processes: job objects + tree-kill + escalation.

## Honesty habits

- Evidence before claims: run it, read the wire traffic.
- Surface problems plainly in UI ("0 models" warnings, "Shared file" badges, honest
  resume-failure fallbacks) — never silent decay.
- Desktop UI is checked by people: never drive the Tauri window or a browser to test UI
  unless explicitly asked. Finish with a short manual checklist instead.

## Git and branches

- For us, `nakul/windows-support` is the main branch: our add-on line on top of upstream
  MonoCode. Upstream-sync branches (currently `nakul/windows-support-upstream-0.7.0`) are where
  new upstream releases are merged and checked; they are fast-forwarded into
  `nakul/windows-support` when Nakul says so. Work on the branch you are told to use.
- No new worktree per feature. Create a worktree or separate branch only when asked
  (for example, parallel agents building at the same time).
- Never touch upstream `hardbeat920/monocode` — fork (`imnakul/monocode-clone`) only, and
  push only when told.
- Merge conflicts: STOP. Explain incoming-vs-ours, consequences and a suggestion in simple
  language, file by file. Never auto-decide.
- Another session's work in progress is hands-off unless told otherwise.
- Small commits with real messages; leave the tree clean (clear CRLF phantoms with
  checkout, never commit them).

## Large-task lifecycle

0. **Spec first.** `docs/specs/<feature>-plan.md` plus its row in `docs/specs/SPECS.md`
   before code. Header: branch and base commit. Sections in order: Idea → Research →
   Plan → Todos (tick as you go) → Issues and fixes → Learnings → Done. It is the handoff
   record: a new agent reads it and resumes.
1. **Implement and test** on the working branch with the full gates.
2. **Stop and hand over** for manual testing in dev mode (`npm run tauri dev`).
3. **Installer only when asked.** Version `<base>-localN-<feature>`, NSIS only
   (`npm run build:windows`); keep every installer so any version stays re-installable.
4. **Fix and record:** changelog entry, Windows learnings (if any), spec marked Done,
   `LOCAL-FEATURES.md` row.

## Records — what to write and where

**Changelog (every change, every tier).** Agents read these entries to understand history,
so keep them short and factual. Newest first, in the file marked **Current** in
`docs/changelog/CHANGELOG.md`:

```
## YYYY-MM-DD — <one-line title>
- What: <one or two plain sentences>
- Files: `path/File.tsx` (lines 10-40) <what changed>; `path/Other.ts` (line 7) <what>
- Verified: tsc ✅ tests ✅ (<count>) build ✅ | manual: <pending items or none>
- Commit: <hash or "uncommitted">
```

**Windows learnings** go to `docs/WINDOWS-CHANGES.md` only when there is something
Windows-specific worth remembering. Add a row to its index table at the top and the section
below it; never rewrite older sections.

**Specs** follow the tier table. `docs/specs/SPECS.md` lists them newest first by date.

**Upstream merges:** conflict decisions with reasons in `docs/notes/archive/upstream-merge-*.md`.

## Communication style

- Short, simple, non-code language first; `file:line` links for code.
- Explain jargon when asked (never assume shorthand landed).
- Report status as: reached / left / blocked-on-you. Ask blocking questions; otherwise
  assume reasonably and state the assumption.
