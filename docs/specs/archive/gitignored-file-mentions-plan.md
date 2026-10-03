# Done — Gitignored file mentions + safe path resolution plan

- Workflow status: Done (historical spec, labeled at Nakul's request). Existing verification caveats below are preserved.


- Worktree path: `E:\Developing\OpenSource\mono-clone` (user-approved direct work)
- Branch: `nakul/windows-support`
- Base commit: `f06b6bed0c9c8aa5b5fbf14546d19333f776b051`
- Date started: 8 Sept 2026

## Initial Idea

Fix two related user-facing failures without changing Git tracking:

1. A direct link to `docs/changelog/LOCAL-CHANGELOG.md` must not open the root
   `CHANGELOG.md` merely because the longer filename ends with the shorter one.
2. Useful local files ignored by Git should be discoverable and selectable in
   the composer `@` picker. Generated/vendor trees and likely secrets must stay
   out of that picker.

## Research

- Reproduced the resolver collision through the real `resolveOpenablePath`
  function: `docs/changelog/LOCAL-CHANGELOG.md` resolved to root `CHANGELOG.md`.
- Reproduced the current mention behavior from the real repository index:
  `@docs` exists because `docs/` contains tracked children, while
  `docs/changelog/LOCAL-CHANGELOG.md` is absent and cannot be searched.
- Explorer listing and file mentions use different sources. Explorer lists
  disk entries and marks ignored entries; Quick Open / mentions currently share
  `git ls-files -co --exclude-standard`, which excludes ignored untracked files.
- Git documentation checked 8 Sept 2026: `--exclude-standard` applies repository,
  info, and global ignore rules; `--ignored` can enumerate ignored files when
  paired with cached/other selection.

## Discussion

- Keep Quick Open unchanged: it remains fast and Git-aware.
- Give chat mentions a separate backend listing so ignored-file support does not
  alter unrelated search behavior.
- Reuse the existing bounded filesystem walk and hard directory exclusions
  (`.git`, `node_modules`, `target`, build outputs, caches, virtual environments).
- Keep likely credentials out of automatic suggestions. This task does not add
  a general secret-file override or an Explorer context-menu action.
- Preserve the current folder-reference semantics: `@docs` points the agent at
  a path; MonoCode does not inline every directory file into the prompt.

## Implementation plan

1. Add regression tests for the path-segment collision and observe failure.
2. Add backend tests for a mention-only file listing that includes useful
   ignored files, marks them ignored, and excludes generated/private content.
3. Add the smallest backend command and TypeScript bridge for that listing.
4. Switch only composer mention loading and send-time mention resolution to the
   mention-specific list.
5. Mark ignored results clearly in the existing mention picker visual language.
6. Run focused tests, then the full agreement gates and lint command requested
   by the repository instructions; record exact results.
7. Update this plan, `docs/WINDOWS-CHANGES.md`, and `docs/changelog/LOCAL-CHANGELOG.md` with verified
   evidence. No installer is built before user dev-mode testing.

## Todos

- [x] Path-collision regression test observed red, then green
- [x] Ignored-file mention backend tests observed red, then green
- [x] Mention picker uses the separate listing
- [x] Ignored state is visible and accessible
- [x] Composer lifecycle extracted to `useComposerFiles` hook with upgrade retention
- [x] Explicit path resolution uses metadata inspection (`statFiles`) before fallbacks
- [x] Git ignored badges verified via `git check-ignore --stdin -z`; non-Git folders do not stamp badges
- [x] Focused and full verification recorded
- [x] Local logs updated
- [ ] User dev-mode testing handoff

## Issues in Dev (+ fixes)

- The first focused Rust command used `--exact` with an unqualified test name
  and selected zero tests. It was explicitly discarded as evidence; rerunning
  by the unique test name selected one test, observed the intended failure, and
  the same command passed after implementation.
- An initial design asked Git to enumerate every ignored file. On this working
  copy that returned 63,525 entries (about 4.3 million output characters) and
  took 762 ms in the observed run, largely because of generated trees. The
  implementation instead combines the existing Git-aware index with a bounded
  disk walk that never enters known generated/vendor directories, then queries
  `git check-ignore --stdin -z` in a single bounded process for candidate files.
  If Git fails or the folder is not a Git repo, `file.ignored` is omitted (`None`)
  to prevent false badges.
- Path collision: when `docs/CHANGELOG.md` existed alongside root `CHANGELOG.md`,
  suffix/basename heuristics could open root. `resolveOpenablePath` now uses
  `statFiles([direct])` to check filesystem metadata (`mtimeMs != null`)
  so existing explicit paths immediately win over fallbacks without reading file content.
- Composer lifecycle: previously closing the picker or typing space risked downgrading
  the file list back to the git-aware index. The `useComposerFiles` hook retains the
  upgraded mention index across picker close, selection, and subsequent typing, while
  ensuring cwd switching clears old files immediately and ignores late responses.
- `npx eslint . --fix` exits 1 before linting because this repository has no
  `eslint.config.*` and no local ESLint dependency. No lint configuration was
  invented in this feature because that would be unrelated tooling churn.
- Automated checks observed after implementation: focused Vitest;
  `npx tsc --noEmit` clean; full Vitest 133 files / 1,415 tests passed;
  `cargo fmt --check`, `cargo check` clean; `cargo test mention_files` 3 passed.
  The exact ESLint limitation above remains unresolved.

## Issues in Installed (+ fixes)

- Not built or installed. Per the working agreement, installer work waits for
  user confirmation after dev-mode testing.

## Learnings

- Explorer visibility and chat mentionability are separate concerns. Explorer
  already reads the disk; chat previously reused the Git-aware Quick Open list.
- `@docs` names a directory path but does not expand every child file into the
  prompt. Ignored files now need to be selected by their own `@` entry when the
  user wants an exact file reference.
- Filename suffix matching is safe only at a real path-segment boundary. A
  longer filename ending in the same letters is not a child path.
- Separating the mention index keeps Quick Open behavior unchanged and makes
  the local customization easier to rebase or propose upstream independently.

## Done

- Implementation and automated verification are finished. User dev-mode
  confirmation is still required, and the repository-wide ESLint instruction
  cannot pass until the project adopts an ESLint configuration.
