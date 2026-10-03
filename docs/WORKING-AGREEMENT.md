# Working agreement — read this first (new agent sessions start here)

This file is the rulebook for working in this repo. It is local-only
(`docs/` is gitignored, never pushed). Before planning or editing anything:

1. Read this file fully.
2. Read `docs/changelog/CHANGELOG.md` and `docs/specs/SPECS.md` first, then open
   the relevant history or spec files. Read the `docs/` folder to understand what has been done: `docs/WINDOWS-CHANGES.md`
   (tracking log with dates, versions, verdicts), `docs/notes/archive/upstream-merge-*.md`
   (every merge-conflict decision), `*-plan.md` (specs before builds),
   `docs/FEATURES.md` (T3-parity gap tracker), `changelog/CHANGELOG-<NN>.md` (per-build record).
   Borrow patterns from that prior work — hover system, probe-then-render,
   pure-function-plus-tests, Tauri command registration — instead of
   inventing new ones.

## Quality gates (nothing lands without these)

### Storage exhaustion is a hard blocker

Before dependency installation, builds or large test runs, check free space on
the Windows drives used by the checkout/worktree, TEMP/TMP, package caches,
Cargo target directory and build output. A different checkout drive does not
avoid a full system/temp drive.

If a required drive is full, a write reports ENOSPC / disk full / insufficient
disk space, or verified available space cannot accommodate the operation:
stop task work immediately. Do not retry installs, tests or builds, change
temp/output/cache locations, or keep editing to work around the blocker.
Cancel only task-owned running work safely; preserve existing files, stashes,
archives and partial results. Do not start backup/build operations that need
more disk space. Do not delete files or caches without explicit authorization.

Report the affected drive/path, measured free space or exact error, last
completed step and remaining work. Mark the spec and index Blocked if the
existing files can be updated safely; if not, report Blocked in the response
without attempting further writes. Resume only after storage is restored,
free space is rechecked, and affected partial outputs are assessed.

- `npx tsc --noEmit` clean, full `npx vitest run` green, `cargo fmt --check`
  and `cargo check` clean — the same bar as upstream `npm run check`.
- Strict TypeScript: no `any`, explicit return types. Tailwind utility
  classes only — no inline styles, no CSS modules, no custom CSS unless
  Tailwind cannot do it.
- Pure functions with unit tests beside them (protocol/scanner style).
- Pre-existing failures stay documented, never silently "fixed" with
  unrelated churn (see `docs/WINDOWS-CHANGES.md`: Windows CRLF family).

## Windows-platform rules

- All Windows code behind `#[cfg(windows)]` — Unix paths and tests
  untouched, macOS/Linux never regress.
- No spawned consoles: every child hidden or supervised; scanners do pure
  file reads, zero spawns. No shell-string concatenation.
- No hardcoded usernames/paths — derive from `USERPROFILE`/`APPDATA`/`PATH`/
  registry. Durability over cleverness: PATH/PATHEXT/registry discovery
  survives upgrades; internal helper exes (sandbox-bin, MSIX) stay excluded.
- Backend is authoritative — frontend never declares health, only renders
  probe results. No fake capabilities: fail loudly with clear messages.
- Don't strand processes: job objects + tree-kill + escalation.

## Honesty habits

- Evidence before claims: run it, read the wire traffic, compare against
  the T3 reference repo (read-only — borrow ideas, never modify it).
- Surface problems plainly in UI ("0 models" warnings, "Shared file"
  badges, honest resume-failure fallbacks) — never silent decay.
- Attribute every failing test (ours vs pre-existing vs incomplete work)
  before touching it. If unsure, stop and ask.

## Git / branch process

- One feature per worktree/branch; bring over to `nakul/windows-support`
  one at a time, full tests each time.
- Never touch upstream `hardbeat920/monocode` — fork
  (`imnakul/monocode-clone`) only, and push only when explicitly told.
- Merge conflicts: STOP. Explain incoming-vs-ours + consequences +
  suggestion in simple, non-code language, file by file. Never auto-decide.
- Another session's WIP is hands-off unless told otherwise (whitespace fmt
  and one-line test-string fixes are the only exceptions ever made, and
  both were reported).
- Never open a browser / Playwright to test UI unless explicitly asked.
- Small commits with real messages; leave the tree clean (clear CRLF
  phantoms with checkout, never commit them).

## Upstream relationship

- Small, one-thing PRs with what/why; UI changes carry before/after
  screenshots. Follow `.github/pull_request_template.md`.
- No new providers (maintainer closes them). Product-direction moves start
  as an *issue* first.
- Big local stacks never go up wholesale — they get rebased into small
  review-ready PRs later. Keep every change upstream-compatible by
  construction (see `docs/WINDOWS-CHANGES.md`: the one-paragraph definition).

## How we describe this approach (use verbatim externally)

> Upstream-compatible by construction: every change is platform-gated,
> regression-free on all supported targets, independently testable, and
> documented — so any slice of the fork lifts cleanly into a small,
> review-ready upstream PR at any time.

One-line version: **merge-clean by design.**

## Feature lifecycle (every feature, same flow — no skipping steps)

0. **Doc first.** Create `docs/specs/<feature>-plan.md` and its row in `docs/specs/SPECS.md` BEFORE code. Header must
   record: worktree path, branch name, base commit of
   `nakul/windows-support` it was cut from. Sections in order: Initial
   Idea → Research → Discussion → Implementation plan → Todos (mark done
   as you go) → Issues in Dev (+ fixes) → Issues in Installed (+ fixes)
   → Learnings → Done. Purpose: later debugging/diagnostics AND session
   handoff — a new agent reads this file + the prior session and resumes.
1. **Worktree.** `E:\Developing\OpenSource\mono-clone-<feature>`
   (lowercase, hyphenated — matches `mono-clone-migrate`,
   `mono-clone-term`, `mono-clone-cline`), branch `feature/<feature>`,
   cut from `nakul/windows-support`. Run `npm install` once per worktree
   (required per worktree for dev/build; ~400 MB each — the real disk hog
   is `target/`, often 3–14 GB, so plan worktree deletion in step 7).
   Feature branches may push to the fork as backup when told — never
   upstream. Only `nakul/windows-support` is the integration line.
2. **Implement + test.** Full gates green plus NEW tests in the same
   format for every new behavior.
3. **STOP.** Report simply, hand over for manual dev-mode testing
   (`npm run tauri dev`). No installer is built until dev-testing passes.
4. **Installable.** Version `<base>-localN-<feature>` (counter disambiguates
   rebuilds; text suffix ⇒ NSIS-only via `--bundles nsis`). Install,
   user tests.
5. **Fix + record.** Fix issues, run all tests, write learnings to
   `docs/WINDOWS-CHANGES.md` and an entry in the file marked Current in
   `docs/changelog/CHANGELOG.md`.
6. **Bring over.** Merge into `nakul/windows-support` (conflict protocol
   above), full tests, done.
7. **Close out.** After the installed build is confirmed working: push all
   feature-branch changes to the remote (fork), then delete the worktree
   (`git worktree remove`) to reclaim space — `target/` alone is several
   GB. Keeping an idle worktree? Delete its `node_modules` first (cheap to
   restore via `npm install`); `cargo clean` only if desperate (full
   rebuild is slow). Never share one `target/` between worktrees while
   multiple agents build — concurrent cargo writes block or corrupt.

- `docs/WINDOWS-CHANGES.md`: dated log — how, what, versions, verdicts.
- `docs/changelog/CHANGELOG.md`: index of numbered per-build records. Write
  new entries in the file marked Current. `docs/changelog/LOCAL-CHANGELOG.md` redirects here.
- `docs/changelog/CHANGELOG-<NN>.md`: per-build record (template inside) — heading,
  implementation, files touched, verification, caveats, advantages,
  tradeoffs, learnings. Fill it after every feature/build.
- `docs/upstream-merge-*.md`: every conflict decision with reasoning.
- Local builds versioned `<base>-localN` (+ feature tag, e.g.
  `0.1.35-local1-skills`), NSIS-only (`--bundles nsis`: MSI rejects text
  suffixes). Keep every installer — any version stays re-installable.

## Communication style

- Short, simple, non-code language first; `file:line` links for code.
- Explain jargon when asked (never assume shorthand landed).
- Report status as: reached / left / blocked-on-you. Ask blocking
  questions; otherwise assume reasonably and state the assumption.
