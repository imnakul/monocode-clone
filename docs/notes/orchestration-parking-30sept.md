# Orchestration parking record - 30 September 2026

## Result

Approved Phases A-D completed on `nakul/windows-support`. The two unfinished orchestration layers remain on separate branches on the `personal` fork. The active checkout stays at base `9397898c923491a9ee1e9cd77c4bcc917634c888`; no commit or push was made on `windows-support`.

The four-feature source was removed only after both remote archives were verified. The independent Codex context-count, Claude human-origin, and Antigravity ACP test changes remain in the active checkout. All local documentation, including the 10:21 IST provider-review entry and `claude-codex-cli-gap-review-30sept.md`, was preserved.

## Hari archive

- Branch: [`hari-orchestration-changes-30sept`](https://github.com/imnakul/monocode-clone/tree/hari-orchestration-changes-30sept)
- Base: `9397898c923491a9ee1e9cd77c4bcc917634c888`
- Source WIP commit: `31442977bb210fa0f168ae90103f9c6a5415fd99`
- Preservation-note commit and verified tip: `5620894a64b88b042833d98f62c07f1e2b77d1ed`
- Verified tree: `dbb8cfb59cd7bcc090639d6b3606c4dc00ff4a22`; all 17 changed-path blobs matched the local archive, including the required warning note.
- Archive checks: TypeScript passed; 62 focused tests across six files passed. This remains unfinished WIP; full gates and desktop verification were not run on the archive.
- Source recovery: apply the pinned stash `966680850080b052aaf4dcd13d12a8c5062831f3` in a clean worktree at the pinned base. Do not pop or drop it.

## Four-feature archive

- Branch: [`park-other-orchestration-mode-changes-30sept`](https://github.com/imnakul/monocode-clone/tree/park-other-orchestration-mode-changes-30sept)
- Base: `9397898c923491a9ee1e9cd77c4bcc917634c888`
- Source WIP commit: `54bdbee65fbfd40ec8ff58e0580cec1cc613f647`
- Preservation-note commit and verified tip: `ac546f3769ab2b69dc1c6df31a1b33ef94378e2c`
- Verified tree: `376ac0eadb1e92a22b01189729fc043d3b11968b`; all 22 changed-path blobs matched the local archive, including the required warning note.
- Archive checks: TypeScript passed; 96 focused tests across four files passed; `cargo fmt --check` passed. This remains unfinished WIP; full gates and desktop verification were not run on the archive.
- The four previously untracked files are retained outside the checkout under `snapshot/parked-source-after-separation/` in the external backup.

## Remote proof and local recovery

- Fork: `personal` = `https://github.com/imnakul/monocode-clone.git`. No push was made to `origin`, `windows-support`, or an upstream repository; no PR was opened.
- Before source separation, `git ls-remote` matched both local tips. Fresh fetches were reconstructed independently and matched each tip, tree, changed-path blobs, and preservation note. Remote proof: [remote-verification.md](../../../mono-clone-backups/orchestration-parking-20260930-101340/remote-verification.md).
- Full Phase A snapshot, tracked patches, partition maps, stash bundle and hash manifest are under `E:\Developing\OpenSource\mono-clone-backups\orchestration-parking-20260930-101340`. Main manifest: `backup-manifest.json`; source layers: `patches/four-feature-candidate-layer.patch`, `patches/retained-independent-fixes.patch`, and `patches/hari-pinned-tracked.patch`.
- Main source backup: `snapshot/tracked-current/`; preserved 47-file late docs snapshot: `snapshot/late-concurrent/current-docs/`; relocated new files: `snapshot/parked-source-after-separation/`.
- A second full 49-file current-docs snapshot is preserved at `snapshot/phase-d-pre-edit-current-docs/`; it includes the later 10:56 provider-scope changelog entry and selected provider-improvements plan. The 10:56/10:21 entries and the provider-review note were rechecked byte-for-byte before the parking changelog entry was added.
- Original stashes remain unchanged: `966680850080b052aaf4dcd13d12a8c5062831f3`, `5b1a97b8b01c488e63c9c6e6e264cb79bcf4f763`, and `d15a6077cf2111145eb68c0096645d0f9bafce3f`.
- All four disposable archive/verification worktrees were clean with no ignored or untracked artifacts, then were removed without force. The two exact local archive branches were deleted with `git branch -d` after final `ls-remote` verification; Git confirmed each matched its `personal` upstream. Both remote parking branches remain available for resumption.

## Source partition and retained changes

- The four-feature layer was removed using the verified partition patch, then each whole-file candidate path was checked against the pinned base. `src/app/App.tsx` was checked separately and retains only `humanAuthored: !options?.managed` from the independent Claude-origin fix.
- Partition audit found that the saved candidate patch also carried that retained App line even though the committed four-feature branch correctly excluded it. After applying the archive removal, the exact one-line caller was restored from the Phase A snapshot and rechecked as the sole App diff. The correction patch is `patches/retained-app-caller.patch`; the remote archive App blob does not contain that caller.
- Retained independent files: `systemBreakdown.ts` and its test; `antigravityAcpLive.test.ts`; harness `types.ts`; Claude provider and protocol files/tests; plus the single App caller above. Their Phase D before/after raw hashes match.
- `AGENTS.md`, the `docs/jira.md` deletion marker, and ignored `docs/notes/jira.md` were retained. The provider-review changelog entry and related note still match the late concurrent-docs snapshot byte-for-byte.
- `src-tauri/Cargo.toml` was not part of the parking patch and was not edited. Its normalized Git blob matches the pinned base; its working-tree representation marker was left as found. The removed feature files `lib.rs`, `session.ts`, and `AgentTranscript.tsx` have no normalized diff from the base.
- Existing `mono-clone-hari`, `mono-clone-remote`, their work and all original stashes were left untouched.

## Retained-code verification

- Focused retained tests: 78/78 passed (8 system-breakdown, 42 Claude protocol, 28 Antigravity ACP).
- `npx tsc --noEmit`: passed.
- `cargo fmt --check`, `cargo check`, and `cargo clippy --workspace --all-targets -- -D warnings`: passed.
- `npm run build` with an external `--outDir` under the backup: passed. Existing CSS pseudo-element, dynamic/static import, large-chunk and external-outDir warnings were reported. The existing `dist/` was not overwritten.
- `git diff --check`: passed.
- Full `npm run check:web`: 3,658 of 3,659 tests passed; `src/features/sessions/ui/Composer.test.ts` failed because the borrowed-attachment remove button query returned null at line 458. That test file is unchanged from the pinned base; attachment-test flakiness is already documented. TypeScript was run separately and passed.
- `cargo test`: the first attempt stopped while creating `target/debug/deps/monocode_lib.lib` with Windows error 112 when E: had 0.49 GB free. After clean archive worktree removal restored about 20 GB, the retry passed 415 tests with 4 ignored. No target cleanup was performed.
- Changed-file ESLint was attempted with ESLint 10.11.0; the repository has no `eslint.config.*`, so lint could not run. No lint config or dependency was added.
- No native desktop smoke test was run. The earlier desktop attempt remains inconclusive; app/run provenance and orchestration control issues remain for a separate user-assisted desktop follow-up.

## Next stages - not started

The current provider-improvements plan records Nakul's selected minor scope (items 1-6) at [provider-daily-work-improvements-plan.md](../specs/archive/provider-daily-work-improvements-plan.md). Treat it as planning input only; confirm it is complete and re-inventory after parking before implementation. Still collect the target version and build kind (web/dev validation or installable NSIS package) and the selected upstream feature/commit details before starting those stages. Current package version is `0.1.55-local3-rail-wallpaper`. No version bump, installer, upstream intake, app-storage recovery, or windows-support commit/push was performed.

When resuming either archived layer, fetch only its named `personal` branch and inspect it in a fresh worktree. Hari and four-feature changes overlap in App, Composer, SessionPane, and orchestration summary; do not merge the archives into each other. Resolve any future overlap file by file under the repo conflict-stop rule.
