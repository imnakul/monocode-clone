This branch contains the four parked orchestration-mode changes for later resumption. Do not delete this remote branch.

# Four-feature orchestration archive

- Branch: `park-other-orchestration-mode-changes-30sept`
- Base: `9397898c923491a9ee1e9cd77c4bcc917634c888`
- Counterpart: `hari-orchestration-changes-30sept` (kept on an independent branch from the same base).
- Scope: ignored-file handoff and integration, lead Stop versus run Cancel, supervision and wake behavior, and Composer pending/failure/attachment reliability. The `humanAuthored` Claude-origin caller is intentionally excluded.
- Status: unfinished and unverified WIP. Do not treat this archive as a release or merge it with the counterpart without a separate overlap review.
- Checks on 2026-09-30: `npx tsc --noEmit` passed; 96 focused Vitest tests passed across four files; `cargo fmt --check` passed. Full suite, Rust Clippy/tests, production build and native desktop checks were not run.
- The dev app and installed app were not used for testing. Manual Tauri verification remains pending.
- Independent context-count, Claude-origin and ACP regression fixes remain on `nakul/windows-support` and are intentionally absent here.
- Retention warning: keep the matching remote branch. Hari remains on the counterpart branch; future overlap resolution is a separate resumption task.