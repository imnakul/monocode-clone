# Repeatable Windows installer build — delegation runbook

- Tier: standard (reusable operational handoff; each version-only run is Small).
- Snapshot: `c3ea722`, 2026-10-04 (refreshed during drafting after another session committed the prior build records). Current observed version: `0.7.0-local3-upstream-sync`.
- Status lives in SPECS.md. Read current files on each run; this snapshot is not a pinned build target.

## In plain words

Build a new Windows installer from the branch currently checked out.
Give it the next local version, keep every previous installer, and verify the
new file before handing it over. Record exactly which checks passed or failed.
Do not change features, install the app, commit, push or publish.

## Goal and user story

As Nakul, I want to request the same local release process repeatedly from a
lower-cost agent without explaining versioning, checks and archiving each time.
This is an execution checklist, not a request to implement build automation.

## Scope and files

Allowed changes per run:

- `package.json:4`: app version; npm updates package-lock.json root metadata.
- `Cargo.toml:7`: workspace package version; Cargo updates Cargo.lock's monocode entry.
- `src-tauri/tauri.conf.json:4`: app version.
- `docs/notes/windows-<version>-build/`: unique per-run README and check logs.
- Current numbered changelog, found through `docs/changelog/CHANGELOG.md`.
- Task-private backups/helper scripts under the actual Git directory, never staged.

Do not edit dependencies, source, tests, build scripts, CI, signing, auth or app
configuration beyond the version. No new branch/worktree, checkout, merge,
cleanup, install, commit, staging, push or desktop/browser automation.
No LOCAL-FEATURES row is needed for version-only builds; behavior is unchanged.

## Confirmed behavior and references

- `package.json:28`: `build:windows` selects stable Windows MSVC and NSIS.
- `package.json:8`: the production frontend build includes TypeScript checking.
- `package.json:19`: check:web runs tests before tsc; a test failure skips its tsc.
- `scripts/bump-version.mjs:6`: set-version accepts plain X.Y.Z only and directly
  edits locks. For local suffixes use npm/Cargo regeneration below; leave that script alone.
- `src-tauri/Cargo.toml:3`: version is inherited from the workspace; do not insert one.
- `src-tauri/tauri.windows.conf.json:24`: updater artifacts disabled for local Windows builds.
- `docs/notes/windows-070-local3-build/README.md`: verified prior build, warnings,
  two known Windows shortcut failures and an isolated CRLF staging timeout.
- Archive on this machine: `E:\Developing\Installable versions`.

Read current AGENTS.md, `.agents/PROFILE.local.md` if present, and
docs/WORKING-AGREEMENT.md before work. Their newer requirements win over stale
line references or commands here. No approval loop is needed for routine steps
already authorized by the user's request to build a new version.

## Inputs and version algorithm

Use the current branch and working tree, including intended uncommitted work.
Never substitute upstream/latest or a different checkout. Print branch, HEAD,
dirty/staged files and proposed version before changing metadata.

If the user supplied a version, use it exactly after validating consistency and
that its installer destination does not already exist. Otherwise:

1. Read package.json version and verify npm lock root, workspace Cargo version,
   Cargo.lock monocode version and Tauri version all match. If they disagree,
   stop and report the values instead of guessing which is authoritative.
2. For `X.Y.Z-localN-label`, keep X.Y.Z and label. Choose one greater than the
   highest N for that same base/label across the manifest and archived installers.
3. For plain `X.Y.Z`, choose `X.Y.Z-localN-current-branch`, with N one greater
   than archived versions matching that base/label, or 1 when none exist.
4. For another naming pattern, ask for the target version before editing.

Example only: local3-upstream-sync becomes local4-upstream-sync if no higher
matching archive exists. Do not hardcode 0.7.0, local4 or this branch name.

## Storage hard stop

Before installs, builds or large tests, check the drives used by the checkout,
Git backups, archive, TEMP/TMP, npm cache, Cargo/rustup and compiler outputs.
Use `Get-PSDrive -PSProvider FileSystem`, path inspection and existing build
records to assess space. Never print secrets or read .env files for this task.
Do not invent a universal free-space threshold. If requirements are uncertain,
report that uncertainty; if available space cannot accommodate the operation,
a required drive is full, or any write fails with ENOSPC/disk-full/insufficient
space, stop task work immediately. Safely cancel only task-owned operations.
Do not retry, keep editing, delete files, move outputs, or redirect temp/cache
to work around exhaustion. Preserve existing work. Report drive/path, measured
space or error, last completed step and remaining work. Mark the per-run record
Blocked only if safe to write; otherwise report Blocked without further writes.
Resume after storage is restored, rechecked and partial outputs assessed.
Cleanup requires explicit authorization.

## Ordered procedure

1. **Preflight.** Read the required docs and skills. Inspect git status (including
   staged changes), branch, HEAD and relevant diffs. Check storage. If SocratiCode
   is available, check codebase_status once; never rebuild/change its index.
   If both plugin-prefixed and standalone tools exist, advise removal of the
   duplicate standalone server with `claude mcp remove socraticode`.
   Build-only work uses exact paths rather than semantic source exploration.
2. **Choose output.** Announce the version algorithm result, version files and
   records you will touch. Ensure the installer name and per-run record directory
   are unused. Keep existing staged/unstaged changes intact. If another session
   is actively modifying source/version files, stop for coordination; an existing
   dev process alone is not permission to kill it.
3. **Back up.** Under a unique task directory in `git rev-parse --git-dir`, save
   the original bytes of version manifests and src-tauri/Cargo.toml and capture
   starting diffs/status. Record intended dirty source in the build README.
4. **Version.** From repo root run in PowerShell:
   `npm.cmd version <new-version> --no-git-tag-version --ignore-scripts`.
   Replace only the previously verified version in Cargo.toml's workspace
   package and tauri.conf.json's version. Preserve encoding/line endings and
   unrelated fields. Do not hand-edit lockfiles. Cargo check below regenerates
   Cargo.lock. Verify all six version values again afterward.
5. **Checks.** Run the commands below sequentially, each into its own log.
   Sequential execution reduces contention with the test suite. Record each
   native exit code immediately; PowerShell's formatted stderr messages are not
   proof of failure. Continue only under the failure rules below.

   ```powershell
   npx.cmd tsc --noEmit
   npm.cmd test
   cargo fmt --check
   cargo check
   ```

   Run repository-configured lint if it exists now; at the snapshot it is
   unavailable. Do not add lint tooling just to fill this gate. For Rust source
   changes included since the previous verified build, also run the current
   repo-required Rust gates (currently npm.cmd run check:rust). For Large work
   or upstream merges, run npm.cmd run check as required by the working agreement.
   Do not skip checks required by newer instructions. No new tests for metadata.
6. **Package.** Run `npm.cmd run build:windows -- --no-sign`, logging output and
   exit code. This includes production frontend and native release builds.
   No separate duplicate npm build is needed when this command succeeds.
   If Cargo waits on another process, wait and give progress updates; do not
   kill the other process or alter build directories. If it prevents progress,
   report the lock owner and request coordination.
7. **Verify before archive.** Find the exact new filename reported by Tauri
   (normally target/release/bundle/nsis/MonoCode_<version>_x64-setup.exe).
   Require successful packaging exit code, existing nonempty file and matching
   FileVersion/ProductVersion. Inspect Authenticode and report NotSigned for the
   ordinary unsigned build. Stop on unexpected metadata/signature behavior;
   never manipulate signing credentials or enable updater signing.
8. **Archive.** Copy that one installer to the archive directory, refusing to
   overwrite an existing file. Avoid archive-installer.mjs because it scans/copies
   multiple bundles. Hash source and archive with Get-FileHash -Algorithm SHA256;
   require equality. Record exact path, bytes, hash and signature status.
9. **Preserve checkout.** Tauri can rewrite src-tauri/Cargo.toml line endings.
   Restore its backed-up original bytes only after verifying that the rewrite
   is content-identical and nobody changed the file since backup. Never overwrite
   concurrent edits. Keep intended new versions and all unrelated/staged work.
10. **Record and report.** Use real current IST time. Write per-run README with
    branch/HEAD, dirty-source provenance, old/new version, archive facts, checks,
    exit codes, warnings/failures and manual checklist. Add one short changelog
    entry to Current. Run git diff --check and inspect final diffs/status for
    accidental source/dependency changes. Leave all work uncommitted/unstaged by
    this agent. Do not mark/archive this standing runbook Done on each build;
    each invocation is recorded separately.

For Windows JSON with empty keys (package-lock.json), use Node JSON.parse for
validation; Windows PowerShell ConvertFrom-Json can fail on the root package's
empty key. Keep helper scripts in the task-private Git directory. Never echo
full manifests/locks unnecessarily. Quote paths containing spaces literally.

## Failure rules and resource ownership

| Condition | Required response |
|---|---|
| Typecheck, fmt, cargo check or packaging fails | Stop before archiving; report first actionable error. Do not repair unrelated code. |
| Exact known shortcut failures in settings.test.ts | May build the requested local installer, recording the gate as red. Reverify names/assertions against current tests and prior build evidence. |
| CRLF staging timeout or another new test failure | Inspect the failing test and run its file once in isolation, unchanged. Record both results. |
| New failure persists or cannot be attributed | Stop before packaging and ask for diagnosis/authorization. Do not treat prior failures as a blanket waiver. |
| Timeout passes in isolation | May package a local build with the original suite failure disclosed and timeout cause marked unresolved. Do not claim a green full suite or loop retries. |
| Missing dependency/tool or changed scripts | Report blocker; do not install/upgrade/reconfigure automatically. |
| Disk exhaustion | Apply the storage hard stop above, including no further record writes unless safe. |
| Metadata/hash mismatch or archive collision | Stop; preserve old archives and report exact mismatch. |
| Another session changes source during build | Artifact provenance is uncertain; stop before archiving and coordinate. |

The build agent owns only its new task processes, backups, logs and installer.
Never cancel another session's processes. On an ordinary failure retain logs
and partial outputs; do not roll back the checkout using destructive Git commands.
Report any partially bumped metadata. If resumed, inspect current versions and
partial artifacts before repeating commands; never increment twice merely to resume.

## Acceptance criteria and verification matrix

| ID | Given / when / then | Evidence |
|---|---|---|
| AC-1 | Current branch requested → build it without switching or pulling | Before/after branch, HEAD, status and source provenance |
| AC-2 | No explicit version → select next counter without archive collision | Old/new version and archive scan; all six version values agree |
| AC-3 | Build runs → checks have real exit codes; failures stay disclosed | Per-command logs and README; no altered tests or source |
| AC-4 | NSIS succeeds → archive only that installer, keeping all earlier ones | Exact path, size, version fields, Authenticode, equal source/archive SHA-256 |
| AC-5 | Existing dirty/staged work → preserve it throughout | Original-byte checks, final status/diff; no staging/commit/push |
| AC-6 | New error/storage problem → follow the specific stop rule | Report last completed step, remaining work and blocker |
| AC-7 | Build ends → human desktop follow-up remains separate | Manual checklist; no desktop/browser automation or install |

All build gates here belong to the executing agent on each invocation; do not
defer them to a later review just because this is a delegated task.

## Skills and manual checks

Load desktop-app; use testing if diagnosing a test failure; spec-implement for
an explicit handoff invoking this runbook. If unavailable, report once and
follow the repo essentials. No frontend or design work is requested.
Manual checks for Nakul/separate desktop session: installation/version, launch,
window controls, existing chats, provider startup, and recent feature spec
checklists relevant to changes included in this build. Never claim these passed.

## Facts, decisions, assumptions and open questions

Facts: local2 and local3 were built and archived using this process; source
HEAD did not change between them. Their records contain the measured results.
Decision: sequential checks for reproducibility, generated lock updates,
unsigned NSIS only, individual archive copy, no feature edits or Git publishing.
Assumptions: Windows machine, dependencies already installed, archive directory
available, current working tree intended for the requested build.
Open questions: none for the documented routine. Unexpected conditions use the
stop rules. A lower-cost agent can execute it; arbitrary build failures may
require a separate debugging task rather than improvisation.

## Handoff prompt — copy this

```text
Follow docs/specs/repeatable-windows-installer-build.md to build a new unsigned
Windows NSIS installer from the current branch and working tree. This request
authorizes this run of the runbook. Read AGENTS.md, the local profile and working
agreement, and load the listed available skills (including spec-implement).
Use the next local version unless I give an exact version.
For this recurring operational run, override spec-implement's pinned-snapshot,
deferred-full-checks and one-off status workflow: validate the current manifests
at preflight, run all build/check commands in this runbook yourself, and record
this invocation separately without changing or archiving the standing spec.
These are explicit instructions for this build request.
Check storage before
large operations; on disk exhaustion stop without retrying, cleanup, output
relocation or unsafe further writes. Run the specified checks, preserve existing
work and all older installers, verify/archive the exact new installer, and add
the per-run build record and changelog. Do not change features, stage, commit,
push, install, sign, publish, switch branches or automate desktop UI. Follow the
failure rules and report a red gate honestly. Complete the routine autonomously;
ask only on a defined blocker. Report using the runbook's format.
```

Optional overrides to append: `Use version <exact-version>.` or
`Archive to <absolute-directory>.` These do not authorize overwriting files.

## Agent report and handoff retro

Report: installer link, branch/HEAD/version, source dirty status; files changed;
checks pass/fail/not run with reasons/counts; size/hash/signature; states covered;
may affect; assumptions and manual follow-ups. State whether each AC is met,
partial or blocked. Follow AGENTS.md final format and SocratiCode debug line.
No claim of fully verified success when any gate is red.

Future improvements: record agent confusion or missed steps here after review;
correct the runbook before the next invocation. No automation script is included.
