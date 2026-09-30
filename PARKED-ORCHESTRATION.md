This branch contains parked Hari orchestration changes for later resumption. Do not delete this remote branch.

# Hari orchestration archive

- Branch: `hari-orchestration-changes-30sept`
- Base: `9397898c923491a9ee1e9cd77c4bcc917634c888`
- Counterpart: `park-other-orchestration-mode-changes-30sept` (kept on an independent branch from the same base).
- Scope: the pinned Hari stash layer, including its nine tracked changes and seven previously untracked files.
- Status: unfinished and unverified WIP. Do not treat this archive as a release or merge it with the counterpart without a separate overlap review.
- Checks on 2026-09-30: `npx tsc --noEmit` passed; 62 focused Vitest tests passed across six files. The two `.test.tsx` files were run with a temporary Vitest include override because the repo config includes only `src/**/*.test.ts`. Full suite, production build, Rust gates and native desktop checks were not run.
- The dev app and installed app were not used for testing. Manual Tauri verification remains pending.
- Independent context-count, Claude-origin and ACP regression fixes remain on `nakul/windows-support` and are intentionally absent here.
- Retention warning: keep the matching remote branch. The original Hari stash remains in the main checkout.