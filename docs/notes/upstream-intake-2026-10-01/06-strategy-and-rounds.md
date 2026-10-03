# Stage 6 — Strategy and round plan

Verified measurements come from [stage 3](03-files.md); source/decision seams from stages 4–5. Every implementation choice below is **Inferred**, pending Nakul and reviewer approval. No implementation is authorized by this analysis.

## Strategy comparison

| Strategy | Conflict / repair load | Gates and unwanted features | Future intake and abandoning a failed step | Disk |
|---|---|---|---|---|
| Tag rounds (recommended) | Verified independent X counts: 23,45,60,68,68,68,68,74,76; optional main 80. Sequential load is Not checked: an accepted earlier weave changes later conflicts. More repeated seam work, smaller release attribution. | Six stable rounds, each full web/Rust/build gates plus manual follow-up; host adds its gates in round 5. Keep disabled features coherent across later merges. | Each accepted tag becomes an ancestor, simplifying next intake. Before committing a failed merge, stop and let owner authorize `git merge --abort`; committed rounds need an owner-approved revert/recovery plan, never reset/stash automatically. | Reuse main dependencies/target; retained analysis scratch is small. No extra worktree. |
| One merge to v0.6.0 / pinned main | Verified 76 / 80 X paths; 527 final-target changed paths. Every interdependent subsystem lands at once; fewer repeated resolutions but largest diagnostic surface. | One gate cycle may still have many repair cycles. Disabled/deferred features must still compile and preserve dependencies. | Upstream ancestry clean after acceptance. Failed uncommitted merge can be aborted with approval; largest rollback and review unit. | Same main checkout footprint; build capacity still must be verified. |
| Selected cherry-picks / ports | Not checked conflict count: final path manifest cannot predict per-commit cherry-pick conflicts. Each dependency chain needs a new simulation/review, potentially much more work for provider/editor changes. | Excludes unwanted subsystems more precisely; tests/build for each logical batch, selected ports still need upstream fixes. | Cherry-picks do not establish the original tag ancestry; later sync can repeat patches/conflicts. Ported fixes need a source ledger. Abort cherry-pick only with owner authorization; never discard unrelated WIP. | Main reuse possible; extra review scratch simulations cheap, extra build worktrees costly. |

Recommend six stable release rounds, grouping v0.4.0–v0.4.3 to include its Windows fix rather than stopping on the earlier release. **Inferred:** this gives the best chance to diagnose regressions against named releases while retaining normal upstream ancestry. It is not the cheapest approach: large local files recur, and all gates repeat. Choose selected ports instead if Nakul rejects a major integrated subsystem such as remote; choose one merge only if reviewer closes full contract gaps and Nakul accepts the whole product scope.

## Round plan

C lists below include final-target conflict groups whose paths are touched by that round; some of those paths may merge cleanly at that particular tag. Only the stage-3 per-tag list proves actual round-1 conflicts; the worker/reviewer must remeasure every subsequent round from its accepted starting commit. R lists are source-risk checkpoints, not claims that every risk already exists at that tag.

### Round 1 — v0.1.56
- Verified target `611e05bcde80c096433ef65f3b085693a1be18c5`; range after `3344bea70341d8ea4d6dea414aa15c13683372e9`; 19 commits. Contents: Drawer/Haze/editor/provider-default/preview/CI repair, macOS Quick composer; source-level streamed-input and confirmation fixes.
- U IDs: U-001, U-002, U-003, U-004, U-005, U-006, U-007, U-034, U-035, U-036, U-037, U-038, U-039, U-040, U-041, U-042.
- Related C IDs: C-01, C-02, C-04, C-06, C-07, C-09, C-10, C-11, C-13, C-15, C-16, C-17, C-19, C-20, C-21, C-24, C-25.
- R checkpoints: R-01, R-05, R-07, R-13, R-14; decisions before start: D-05, D-08, D-11, D-12, D-13, D-14.
- Independent pinned-local simulation: 23 X paths. Proposed effort L (Inferred): broad provider/workspace/Windows contract repair, not just version strings.
- Prerequisites: previous stable round accepted (round 1 instead confirms exact pinned local baseline); owner answers listed D items, explicitly authorizes merge/feature scope/version; reviewer verifies round-specific deps/capabilities/CI and missing source contracts; clean tracked tree and sufficient C/E/cache/target storage.
- Worker gates: `npx tsc --noEmit`; focused `npx vitest run <changed suites>` with new combined regressions; full `npx vitest run`; `npm run check:rust` (fmt/clippy/tests); `cargo check`; `npm run build`; `git diff --check` and `git diff --cached --check`. No ESLint config: document unavailable lint rather than adding/disabling rules. 
- Local label: proposed `0.1.56-local1-intake-r1`; **Assumed pending Nakul: D-14 = approve or replace this exact label**. Installer: none in worker phase; only after Nakul's dev checks pass and a separate build authorization.
- Separate manual follow-up (Nakul or desktop-access session; never the MonoCode worker): Drawer keeps local menu/hover; editor format/preview preserve dirty CRLF saves; Cline appears; wallpaper retains five effects; scoped forms, branches and Stop/Queue remain usable.
- Records proposed for later authorized work: `docs/specs/upstream-intake-round-1.md`; `docs/notes/upstream-intake-round-1-record.md`; current numbered changelog and `docs/WINDOWS-CHANGES.md`. Record source SHAs, exact resolved files, standing calls, D answers, commands/results, unverified desktop cases and accepted commit. These files (apart from round-1 Draft) are not created by this analyst.

### Round 2 — v0.2.0
- Verified target `19b992283debd03664dd5eb07aa820c5034b6338`; range after `611e05bcde80c096433ef65f3b085693a1be18c5`; 15 commits. Contents: BTW, opt-in Operator, account information, usage-limit resumes; provider maintenance.
- U IDs: U-007, U-008, U-009, U-010, U-011, U-043, U-044, U-045, U-046, U-047, U-048, U-049.
- Related C IDs: C-01, C-02, C-04, C-06, C-08, C-13, C-14, C-15, C-16, C-17, C-20, C-21, C-22, C-24, C-25, C-26.
- R checkpoints: R-01, R-09, R-13, R-14, R-15; decisions before start: D-01, D-07, D-10, D-12, D-13, D-14.
- Independent pinned-local simulation: 45 X paths. Proposed effort L (Inferred): broad provider/workspace/Windows contract repair, not just version strings.
- Prerequisites: previous stable round accepted (round 1 instead confirms exact pinned local baseline); owner answers listed D items, explicitly authorizes merge/feature scope/version; reviewer verifies round-specific deps/capabilities/CI and missing source contracts; clean tracked tree and sufficient C/E/cache/target storage.
- Worker gates: `npx tsc --noEmit`; focused `npx vitest run <changed suites>` with new combined regressions; full `npx vitest run`; `npm run check:rust` (fmt/clippy/tests); `cargo check`; `npm run build`; `git diff --check` and `git diff --cached --check`. No ESLint config: document unavailable lint rather than adding/disabling rules. 
- Local label: proposed `0.2.0-local1-intake-r2`; **Assumed pending Nakul: D-14 = approve or replace this exact label**. Installer: none in worker phase; only after Nakul's dev checks pass and a separate build authorization.
- Separate manual follow-up (Nakul or desktop-access session; never the MonoCode worker): Sidechat vs BTW labels; no helper tool access; held queue survives reset/restart; Plan never replays stored grants.
- Records proposed for later authorized work: `docs/specs/upstream-intake-round-2.md`; `docs/notes/upstream-intake-round-2-record.md`; current numbered changelog and `docs/WINDOWS-CHANGES.md`. Record source SHAs, exact resolved files, standing calls, D answers, commands/results, unverified desktop cases and accepted commit. These files (apart from round-1 Draft) are not created by this analyst.

### Round 3 — v0.3.0
- Verified target `c9cdc577996efe71d33d321483521b9de6902004`; range after `19b992283debd03664dd5eb07aa820c5034b6338`; 21 commits. Contents: Custom keys, configured CLI binaries, JSONC, bulk tab lifecycle; CRLF preservation and provider fixes.
- U IDs: U-001, U-008, U-012, U-013, U-014, U-015, U-050, U-051, U-052, U-053, U-054, U-055, U-056, U-057, U-058, U-059, U-060, U-061, U-062, U-063.
- Related C IDs: C-01, C-02, C-03, C-04, C-06, C-07, C-09, C-11, C-13, C-15, C-16, C-17, C-21, C-23, C-24, C-25, C-26, C-27.
- R checkpoints: R-03, R-04, R-12, R-13; decisions before start: D-04, D-05, D-11, D-13, D-14.
- Independent pinned-local simulation: 60 X paths. Proposed effort L (Inferred): broad provider/workspace/Windows contract repair, not just version strings.
- Prerequisites: previous stable round accepted (round 1 instead confirms exact pinned local baseline); owner answers listed D items, explicitly authorizes merge/feature scope/version; reviewer verifies round-specific deps/capabilities/CI and missing source contracts; clean tracked tree and sufficient C/E/cache/target storage.
- Worker gates: `npx tsc --noEmit`; focused `npx vitest run <changed suites>` with new combined regressions; full `npx vitest run`; `npm run check:rust` (fmt/clippy/tests); `cargo check`; `npm run build`; `git diff --check` and `git diff --cached --check`. No ESLint config: document unavailable lint rather than adding/disabling rules. 
- Local label: proposed `0.3.0-local1-intake-r3`; **Assumed pending Nakul: D-14 = approve or replace this exact label**. Installer: none in worker phase; only after Nakul's dev checks pass and a separate build authorization.
- Separate manual follow-up (Nakul or desktop-access session; never the MonoCode worker): Migrated custom binary still launches ACP/Cline; JSONC and formatted CRLF saves round-trip; shortcut conflicts are clear; bulk deletion clears queues and terminals.
- Records proposed for later authorized work: `docs/specs/upstream-intake-round-3.md`; `docs/notes/upstream-intake-round-3-record.md`; current numbered changelog and `docs/WINDOWS-CHANGES.md`. Record source SHAs, exact resolved files, standing calls, D answers, commands/results, unverified desktop cases and accepted commit. These files (apart from round-1 Draft) are not created by this analyst.

### Round 4 — v0.4.3
- Verified target `6ffc99589be087d16bb6d764afdc3502e5046750`; range after `c9cdc577996efe71d33d321483521b9de6902004`; 25 commits. Contents: Multiple folders, native clipboard, adjacent panes, Pi usage, generated images, path copy, celebrations and performance work; include the v0.4.3 Windows regression patch and v0.4.1/v0.4.2 fixes together.
- U IDs: U-009, U-010, U-016, U-017, U-018, U-019, U-020, U-021, U-022, U-064, U-065, U-066, U-067, U-068, U-069, U-070, U-071, U-072, U-073, U-074, U-075, U-076.
- Related C IDs: C-01, C-02, C-04, C-05, C-06, C-07, C-08, C-10, C-12, C-13, C-15, C-16, C-17, C-21, C-23, C-24, C-25.
- R checkpoints: R-10, R-12, R-13, R-14; decisions before start: D-05, D-09, D-12, D-13, D-14.
- Independent pinned-local simulation: 68 X paths. Proposed effort L (Inferred): broad provider/workspace/Windows contract repair, not just version strings.
- Prerequisites: previous stable round accepted (round 1 instead confirms exact pinned local baseline); owner answers listed D items, explicitly authorizes merge/feature scope/version; reviewer verifies round-specific deps/capabilities/CI and missing source contracts; clean tracked tree and sufficient C/E/cache/target storage.
- Worker gates: `npx tsc --noEmit`; focused `npx vitest run <changed suites>` with new combined regressions; full `npx vitest run`; `npm run check:rust` (fmt/clippy/tests); `cargo check`; `npm run build`; `git diff --check` and `git diff --cached --check`. No ESLint config: document unavailable lint rather than adding/disabling rules. 
- Local label: proposed `0.4.3-local1-intake-r4`; **Assumed pending Nakul: D-14 = approve or replace this exact label**. Installer: none in worker phase; only after Nakul's dev checks pass and a separate build authorization.
- Separate manual follow-up (Nakul or desktop-access session; never the MonoCode worker): Paste image/file attachments and queue them; branches retain generated images after sibling deletion; native clipboard/reveal have no consoles; copy Windows paths; navigation/drawer performance; Windows window startup; celebrations respect reduced motion and never consume human turn ownership.
- Records proposed for later authorized work: `docs/specs/upstream-intake-round-4.md`; `docs/notes/upstream-intake-round-4-record.md`; current numbered changelog and `docs/WINDOWS-CHANGES.md`. Record source SHAs, exact resolved files, standing calls, D answers, commands/results, unverified desktop cases and accepted commit. These files (apart from round-1 Draft) are not created by this analyst.

### Round 5 — v0.5.0
- Verified target `b46230eec3d7854e414dd24135dad95db31e148f`; range after `6ffc99589be087d16bb6d764afdc3502e5046750`; 13 commits. Contents: Remote SSH/host, Help links, cancel commit messages and account readiness refinements.
- U IDs: U-023, U-024, U-025, U-077, U-078, U-079, U-080, U-081, U-082, U-083, U-084, U-085.
- Related C IDs: C-01, C-02, C-03, C-04, C-06, C-07, C-09, C-10, C-13, C-15, C-16, C-17, C-19, C-20, C-21, C-22, C-23, C-26.
- R checkpoints: R-02, R-08, R-11, R-12, R-14, R-15; decisions before start: D-03, D-05, D-07, D-12, D-13, D-14.
- Independent pinned-local simulation: 74 X paths. Proposed effort L (Inferred): broad provider/workspace/Windows contract repair, not just version strings.
- Prerequisites: previous stable round accepted (round 1 instead confirms exact pinned local baseline); owner answers listed D items, explicitly authorizes merge/feature scope/version; reviewer verifies round-specific deps/capabilities/CI and missing source contracts; clean tracked tree and sufficient C/E/cache/target storage.
- Worker gates: `npx tsc --noEmit`; focused `npx vitest run <changed suites>` with new combined regressions; full `npx vitest run`; `npm run check:rust` (fmt/clippy/tests); `cargo check`; `npm run build`; `git diff --check` and `git diff --cached --check`. No ESLint config: document unavailable lint rather than adding/disabling rules. Also `npm run host:build` and `npm run test:host` for host code; inspect their scripts before running.
- Local label: proposed `0.5.0-local1-intake-r5`; **Assumed pending Nakul: D-14 = approve or replace this exact label**. Installer: none in worker phase; only after Nakul's dev checks pass and a separate build authorization.
- Separate manual follow-up (Nakul or desktop-access session; never the MonoCode worker): Separate desktop session: connect/reconnect local-to-remote; unsupported provider/scopes/forms shown honestly; cancel helpers without overwriting edits; no extra consoles or credential exposure.
- Records proposed for later authorized work: `docs/specs/upstream-intake-round-5.md`; `docs/notes/upstream-intake-round-5-record.md`; current numbered changelog and `docs/WINDOWS-CHANGES.md`. Record source SHAs, exact resolved files, standing calls, D answers, commands/results, unverified desktop cases and accepted commit. These files (apart from round-1 Draft) are not created by this analyst.

### Round 6 — v0.6.0
- Verified target `48fe62a869658929025b0c67cb386b8a59a39d3e`; range after `b46230eec3d7854e414dd24135dad95db31e148f`; 26 commits. Contents: Copy session IDs, remaining quota default, Autosave, executable updates, MCP management, Linux glass, slash modes and later account/usage refinements.
- U IDs: U-010, U-023, U-026, U-027, U-028, U-029, U-030, U-031, U-032, U-086, U-087, U-088, U-089, U-090, U-091, U-092, U-093, U-094.
- Related C IDs: C-01, C-02, C-03, C-06, C-07, C-08, C-09, C-13, C-15, C-16, C-17, C-21, C-22, C-24, C-25.
- R checkpoints: R-04, R-06, R-07, R-12, R-13; decisions before start: D-02, D-05, D-06, D-13, D-14.
- Independent pinned-local simulation: 76 X paths. Proposed effort L (Inferred): broad provider/workspace/Windows contract repair, not just version strings.
- Prerequisites: previous stable round accepted (round 1 instead confirms exact pinned local baseline); owner answers listed D items, explicitly authorizes merge/feature scope/version; reviewer verifies round-specific deps/capabilities/CI and missing source contracts; clean tracked tree and sufficient C/E/cache/target storage.
- Worker gates: `npx tsc --noEmit`; focused `npx vitest run <changed suites>` with new combined regressions; full `npx vitest run`; `npm run check:rust` (fmt/clippy/tests); `cargo check`; `npm run build`; `git diff --check` and `git diff --cached --check`. No ESLint config: document unavailable lint rather than adding/disabling rules. 
- Local label: proposed `0.6.0-local1-intake-r6`; **Assumed pending Nakul: D-14 = approve or replace this exact label**. Installer: none in worker phase; only after Nakul's dev checks pass and a separate build authorization.
- Separate manual follow-up (Nakul or desktop-access session; never the MonoCode worker): Old quota setting policy; Autosave off until enabled and CRLF preserved; MCP forms remain local typed forms; ACP startup remains lazy; updates disabled unless separately approved; Windows wallpaper/glass/hover unchanged.
- Records proposed for later authorized work: `docs/specs/upstream-intake-round-6.md`; `docs/notes/upstream-intake-round-6-record.md`; current numbered changelog and `docs/WINDOWS-CHANGES.md`. Record source SHAs, exact resolved files, standing calls, D answers, commands/results, unverified desktop cases and accepted commit. These files (apart from round-1 Draft) are not created by this analyst.

### Round 7 — optional post-tag main
- Verified target `43aac9d216c323a7e04c9037eb0b251dd840cc7a`; range after `48fe62a869658929025b0c67cb386b8a59a39d3e`; 9 commits. Contents: Optional nine post-tag commits, including Codex effort animation, Linux ARM artifacts, lazy restore and diff fixes.
- U IDs: U-033, U-095, U-096, U-097, U-098, U-099, U-100, U-101, U-102.
- Related C IDs: C-04, C-06, C-07, C-12, C-13, C-15, C-18, C-19, C-20, C-25.
- R checkpoints: R-12; decisions before start: D-14.
- Independent pinned-local simulation: 80 X paths. Proposed effort M (Inferred): contained release group, but still full regression gates.
- Prerequisites: previous stable round accepted (round 1 instead confirms exact pinned local baseline); owner answers listed D items, explicitly authorizes merge/feature scope/version; reviewer verifies round-specific deps/capabilities/CI and missing source contracts; clean tracked tree and sufficient C/E/cache/target storage.
- Worker gates: `npx tsc --noEmit`; focused `npx vitest run <changed suites>` with new combined regressions; full `npx vitest run`; `npm run check:rust` (fmt/clippy/tests); `cargo check`; `npm run build`; `git diff --check` and `git diff --cached --check`. No ESLint config: document unavailable lint rather than adding/disabling rules. 
- Local label: proposed `0.6.0-local1-intake-r7`; **Assumed pending Nakul: D-14 = approve or replace this exact label**. Installer: none in worker phase; only after Nakul's dev checks pass and a separate build authorization.
- Separate manual follow-up (Nakul or desktop-access session; never the MonoCode worker): Windows restored panes/diff navigation, Composer overflow and effort selection; Linux artifacts checked by separate appropriate platform reviewer.
- Records proposed for later authorized work: `docs/specs/upstream-intake-round-7.md`; `docs/notes/upstream-intake-round-7-record.md`; current numbered changelog and `docs/WINDOWS-CHANGES.md`. Record source SHAs, exact resolved files, standing calls, D answers, commands/results, unverified desktop cases and accepted commit. These files (apart from round-1 Draft) are not created by this analyst.

## Where the work happens

Recommend one worker directly in `E:\Developing\OpenSource\mono-clone` on `nakul/windows-support`, matching the trial's standing handoff preference. The 23 round-1 conflicts justify careful reviewer-approved instructions, but do not alone justify another Rust build tree. Trade-off: this blocks the shared checkout during repair; if another session needs it or Nakul requests isolation, stop and agree an alternative before changing location. Do not touch parked worktrees or the three stashes.

Verified stage-0 free bytes: C 7,610,978,304; E 19,266,637,824. Working agreement estimates ~400 MB dependencies and 3–14 GB Rust target per additional worktree; actual upcoming requirements are Not checked. Reuse existing caches, remeasure all relevant drives before checks, and stop on insufficient capacity. Do not delete or relocate anything as a workaround. Retain the analysis scratch clone for review; measure its final size in stage 8.

## Who does what

- Nakul: feature/behavior decisions, merges and version labels, dependency/CI/capability/auth/stored-data approvals, manual dev acceptance, later installer and commit/push permissions.
- Reviewer: recompute conflict manifests at each actual start; validate full remote/MCP/native contracts and dependency provenance; audit preservation source/test coverage; approve file instructions and judge gate failures.
- Worker: only after authorization and D answers, perform the specified merge/weaves, repair source contracts, add meaningful regression tests and run gates; record exact evidence. Stop on unknown conflicts, unclear product semantics, storage blockers or failures outside approved scope. No independent product choices or native UI inspection.

## Decisions that block rounds

| Open decision | Blocks rounds | Assumption pending owner (changes on other answer) |
|---|---|---|
| D-01 | 2 | **Assumed pending Nakul: D-01 = Keep Sidechat for a durable branch and BTW for read-only questions, with distinct labels.** Other answer: reviewer revises feature scope/file instructions and gates before the affected merge starts. |
| D-02 | 6 | **Assumed pending Nakul: D-02 = Defer installation until Windows subprocess safety is audited; use one notice flow and lazy ACP discovery.** Other answer: reviewer revises feature scope/file instructions and gates before the affected merge starts. |
| D-03 | 5 | **Assumed pending Nakul: D-03 = Split remote into its own round; publish an explicit supported-feature matrix and keep remote ACP/Cline unsupported until approved ports exist.** Other answer: reviewer revises feature scope/file instructions and gates before the affected merge starts. |
| D-04 | 3 | **Assumed pending Nakul: D-04 = Use one canonical validated store, migrate old values once, preserve ACP/Cline, and report invalid paths.** Other answer: reviewer revises feature scope/file instructions and gates before the affected merge starts. |
| D-05 | 1,3,4,5,6 | **Assumed pending Nakul: D-05 = Approve packages, capabilities and CI per round after reviewer provenance/security checks; do not authorize all changes from this brief.** Other answer: reviewer revises feature scope/file instructions and gates before the affected merge starts. |
| D-06 | 6 | **Assumed pending Nakul: D-06 = Prefer the upstream remaining default, preserving clamp/round behavior; decide how old saved preference is honored or retired.** Other answer: reviewer revises feature scope/file instructions and gates before the affected merge starts. |
| D-07 | 2,5 | **Assumed pending Nakul: D-07 = Keep tool-free structured helpers as a separate mode; add upstream cancellation without allowing their tool use.** Other answer: reviewer revises feature scope/file instructions and gates before the affected merge starts. |
| D-08 | 1 | **Assumed pending Nakul: D-08 = Take Haze for chat only; keep the existing five wallpaper effects and their renderer.** Other answer: reviewer revises feature scope/file instructions and gates before the affected merge starts. |
| D-09 | 4 | **Assumed pending Nakul: D-09 = Require reference-ownership audit and original/branch deletion regression before enabling copied image history.** Other answer: reviewer revises feature scope/file instructions and gates before the affected merge starts. |
| D-10 | 2 | **Assumed pending Nakul: D-10 = Keep independent hold reasons; enable auto-resume only after combined reset/restart tests.** Other answer: reviewer revises feature scope/file instructions and gates before the affected merge starts. |
| D-11 | 1,3 | **Assumed pending Nakul: D-11 = Repair these source contracts before any round is accepted; preserve validated forms and non-plan grant boundaries.** Other answer: reviewer revises feature scope/file instructions and gates before the affected merge starts. |
| D-12 | 1,2,4,5 | **Assumed pending Nakul: D-12 = Keep legacy defaults, local path repair and SQL queue columns; approve stored-data handling after fixtures pass.** Other answer: reviewer revises feature scope/file instructions and gates before the affected merge starts. |
| D-13 | 1,2,3,4,5,6 | **Assumed pending Nakul: D-13 = Confirm the feature menu and release scope before each round; keep Operator off until separately approved and exclude parked Hari work.** Other answer: reviewer revises feature scope/file instructions and gates before the affected merge starts. |
| D-14 | 1,2,3,4,5,6,7 | **Assumed pending Nakul: D-14 = Choose each local version label and separately approve or defer all nine post-tag commits. Default plan stops at v0.6.0.** Other answer: reviewer revises feature scope/file instructions and gates before the affected merge starts. |

## Risks to the plan

Not checked: sequential conflicts, build duration/storage peak, desktop behavior, complete native/host contracts and package provenance. The seven blocks are a review structure, not an estimated calendar promise. Stage 1's incomplete generic test anchors and stage 4's exact Not analysed paths must be closed before the affected round. If round 1 preserves fewer behaviors than its table anticipates, stop and revise later instructions; do not push failures forward.
