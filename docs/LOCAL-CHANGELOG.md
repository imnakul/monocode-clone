# Local changelog — per-build record

Local-only (`docs/` is gitignored). Fill one entry per feature/build using
the template. Deep debugging notes go to `windows-changes.md`; merge
decisions to `upstream-merge-*.md`.

## Template (copy for each entry)
<!--
## <version> — <date> — <title>

- What / why (1–2 lines):
- Implementation:
- Files touched:
- Verification (commands + results):
- Caveats / known issues:
- Advantages / tradeoffs:
- Learnings:
-->

## 0.1.35-local4-token-usage — 11 Sept 2026 — Token, Windows editor, diff, and interaction hardening

- **What / why (1–2 lines):** Hardening release for Windows support on the direct-integration branch (`nakul/windows-support`). Unifies newline handling across editing and staging, enables opening deleted files directly as read-only diffs, adds experimental detailed context inspection and remaining quota display, hardens turn ownership and session costing telemetry, unifies composer Queue/Steer keyboard actions, and ensures smooth shared-hover pill transitions across list gaps.
- **Implementation:**
  1. *Windows newline normalization and safe staging:* Internal LF canonicalization for CodeMirror/diffs; preserve CRLF on save when detected; Tauri Rust backend path-aware clean filter emulation matching native Git attributes during staging; elimination of CRCRLF blank lines.
  2. *Source Control navigation and deleted-file diffs:* Widen click hitboxes to full row; open deleted files directly into read-only Git diff views (`newGitDiffTab`) with staged/unstaged awareness; Windows path separator matching (`\` vs `/`); preserve tab focus and workspace snapshots.
  3. *Experimentation settings, Detailed Context, and Remaining Quota:* Settings → Experimentation page hosting toggles for Detailed Context (default OFF with clean two-line summary fallback; full segmented bar, memory files, skills, and model costing inspector when ON) and Remaining Quota (default OFF, displaying `XX% left` across ContextMeter and UsageFooter instead of consumed quota).
  4. *Telemetry lifecycle and costing correctness:* Retain latest-turn usage after completion; compute cumulative session usage; prevent active-turn double counting; ensure user steering messages do not usurp turn ownership or duration metrics from the primary turn.
  5. *Composer Queue/Steer keyboard behavior:* Shift+Enter always inserts newline; Enter executes configured Queue or Steer behavior while busy; Ctrl+Enter / Cmd+Enter executes the alternate action; unified suggestion action resolver (`resolveEffectiveSuggestionAction`) handling slash commands and mentions; bare `/` remains open; ignore IME composition; dynamic Send button tooltip and aria-label.
  6. *Shared-hover continuity and consumer integrations:* Smooth shared hover pill motion across list gaps (`data-shared-hover-continuity`) across Sidebar, Inbox filters, Chats, Sidechats, and Notes; stop transitions at section dividers and folders; preserve persistent active-row background; cache-first NotesView loading via `peekNotes()` to eliminate initial open flicker.
- **Files touched:**
  - *Area 1 (Newline/staging):* `src-tauri/src/fs.rs`, `src/lib/fs.ts`, `src/lib/format.ts`, `src/lib/format.test.ts`, `src/lib/lineEndings.ts`, `src/lib/lineEndings.test.ts`, `src/lib/unifiedDiff.ts`, `src/lib/unifiedDiff.test.ts`, `src/surfaces/editorDoc.ts`, `src/surfaces/editorDoc.test.ts`, `src/surfaces/editorGit.ts`, `src/surfaces/editorGit.test.ts`, `src/surfaces/FileEditor.tsx`
  - *Area 2 (Source Control/diffs):* `src/App.tsx`, `src/chrome/GitChangesPanel.tsx`, `src/chrome/GitChangesPanel.test.ts`, `src/chrome/SourceControl.tsx`, `src/chrome/SurfaceTabs.tsx`, `src/chrome/SurfaceTabs.test.ts`, `src/lib/layout.ts`, `src/lib/layout.test.ts`, `src/lib/workspaceSnapshot.ts`, `src/lib/workspaceSnapshot.test.ts`, `src/surfaces/FilePane.tsx`, `src/surfaces/FilePane.test.ts`, `src/surfaces/GitFileDiffView.tsx`, `src/surfaces/GitFileDiffView.test.ts`, `src/surfaces/WorkingTreeDiff.tsx`, `src/surfaces/WorkingTreeDiff.test.ts`, `src/surfaces/diffPathMatching.ts`, `src/surfaces/filePaneSelection.ts`, `src/surfaces/gitFileDiffViewState.ts`
  - *Area 3 (Experimentation/Context/Quota):* `src/chrome/ContextMeter.tsx`, `src/chrome/ContextMeter.test.ts`, `src/chrome/Experimentation.test.ts`, `src/chrome/SettingsRail.tsx`, `src/chrome/UsageFooter.tsx`, `src/lib/rateLimits.ts`, `src/lib/rateLimits.test.ts`, `src/lib/settings.ts`, `src/lib/settings.test.ts`, `src/lib/tokenCosting.ts`, `src/lib/tokenCosting.test.ts`, `src/surfaces/SettingsView.tsx`
  - *Area 4 (Telemetry/Costing):* `src/lib/harness/apply.ts`, `src/lib/harness/apply.test.ts`, `src/lib/harness/tokenUsageLifecycle.test.ts`, `src/lib/tokenAccounting.ts`, `src/lib/tokenAccounting.test.ts`, `src/surfaces/SessionPane.tsx`
  - *Area 5 (Composer Queue/Steer):* `src/chrome/Composer.tsx`, `src/chrome/composerAction.ts`, `src/chrome/composerAction.test.ts`, `src/lib/settings.ts`, `src/lib/settings.test.ts`, `src/surfaces/SessionPane.tsx`
  - *Area 6 (Shared Hover/Continuity):* `src/chrome/SharedHoverHighlight.tsx`, `src/chrome/SharedHoverHighlight.test.ts`, `src/chrome/InboxFiltersMenu.tsx`, `src/chrome/InboxFiltersMenu.test.ts`, `src/chrome/Sidebar.tsx`, `src/chrome/Sidebar.test.ts`, `src/lib/sessionFolders.ts`, `src/lib/sessionFolders.test.ts`, `src/surfaces/ChatPanel.tsx`, `src/surfaces/ChatPanel.test.ts`, `src/surfaces/InboxView.tsx`, `src/surfaces/InboxView.test.ts`, `src/surfaces/NotesView.tsx`, `src/surfaces/NotesView.test.ts`
- **Automated verification:**
  - `npm run check:web` (vitest + tsc): 150 test files, 1,595 tests passed; TypeScript clean (0 errors).
  - `npm run check:rust` (`cargo fmt --check`, `cargo clippy`, `cargo test`): clean, 221 tests passed, 0 failed.
  - `npx eslint . --fix`: reported exit code 1 due to missing `eslint.config.*` (pre-existing repository tooling limitation; no files modified).
  - `git diff --check`: clean (0 whitespace / conflict issues).
- **Installed-runtime verification:**
  - Installer: `E:\Developing\Installable versions\MonoCode_0.1.35-local4-token-usage_x64-setup.exe`
  - Size: `9,392,024` bytes
  - Timestamp: `2026-09-11 07:23:02 UTC`
  - SHA-256: `574A196841539C9F410145A2A40226408FD536B2579885140A8A6FD3A33F0068`
  - Authenticode: `NotSigned`
  - Runtime verdict: Fully verified working by Nakul on Windows, including Notes/Chats shared-hover corrections, context inspector toggles, deleted-file git diff tabs, and queue/steer composer hotkeys.
- **Caveats and known deferred work:**
  - Gitignored file mentions in chat `@` search (deferred; not in local4).
  - VS Code-style preview tabs and replace-versus-pin behavior.
  - Animated movement of persistent active selection backgrounds.
  - File context menus in Explorer.
- **Advantages / tradeoffs:**
  - Experimentation settings default OFF avoids cognitive load for casual usage while providing deep diagnostics for power users.
  - Cache-first `peekNotes()` provides instant rendering without layout shift.
  - Rust clean filter staging guarantees byte-for-byte git parity on Windows.
- **Learnings:**
  - Line-ending handling must be canonicalized at every layer (memory, UI, git index).
  - Multi-action inputs (Enter / Shift / Ctrl / IME) require a single pure resolution function to avoid edge-case regressions across platforms.

### Historical Component Detail: Quota Remaining Left Percentage Display (Included in 0.1.35-local4-token-usage)

- What / why (1–2 lines): For Claude and Codex plan quotas (5-hour and weekly limits), switch from displaying how much quota was used to showing how much quota is remaining left (e.g., `42% left`), giving users clear foresight on remaining capacity before rate limiting occurs.
- Implementation: Added `formatRemainingPercent` in `src/lib/rateLimits.ts` (`100 - usedPercent`), updated `ContextMeter.tsx` ("Plan quota" rows displaying `XX% left` alongside reset timers), updated `UsageFooter.tsx` status bar provider chip to show `XX% left 5h · YY% left wk`, and updated `rateLimitWindowTooltip`.
- Files touched: `src/lib/rateLimits.ts`, `src/lib/rateLimits.test.ts`, `src/chrome/ContextMeter.tsx`, `src/chrome/UsageFooter.tsx`, `docs/LOCAL-CHANGELOG.md`.
- Verification (commands + results): `npm run check:web` passed cleanly (136 test files, 1,420 tests passed; `tsc --noEmit` 0 errors).
- Advantages / tradeoffs: Showing remaining percentage matches user mental models ("how much do I have left?") far better than consumed percentage.

### Historical Component Detail: System & Tools Context Breakdown & Diagnostic Inspector (Included in 0.1.35-local4-token-usage)

- What / why (1–2 lines): Decompose the large "System & tools" context segment (which often takes 40–80K tokens due to MCP servers and tool declarations) into an expandable, itemized diagnosis list detailing base instructions, global rules, environment context, built-in tools, and active MCP servers/plugins.
- Implementation: Created `src/lib/systemBreakdown.ts` and `src/lib/systemBreakdown.test.ts` to discover and parse `~/.claude.json` (global & project MCP servers), `~/.claude/CLAUDE.md`, `~/.codex/config.toml` (plugins & MCP servers), `~/.codex/AGENTS.md`. Integrated with `ContextMeter.tsx` to display an expandable accordion under "System & tools", itemizing Base prompt (Claude/Codex), Global rules, Environment context, Built-in tools (Bash, FileEdit, FileRead, Agent, etc.), and active MCP Servers (Playwright, Screenpipe, Tabularis, Notion, Penpot, etc.) with proportional token weights and commands/URLs.
- Files touched: `src/lib/systemBreakdown.ts`, `src/lib/systemBreakdown.test.ts`, `src/chrome/ContextMeter.tsx`, `docs/LOCAL-CHANGELOG.md`.
- Verification (commands + results): `npm run check:web` passed cleanly (136 test files, 1,419 tests passed; `tsc --noEmit` 0 errors).
- Caveats / known issues: MCP tool weights are proportional estimations based on server tool density heuristics (e.g. Playwright ~3.5x vs basic ~1.0x) normalized against the wire telemetry context usage.
- Advantages / tradeoffs: Users can instantly identify which MCP servers or global rules consume large percentages of their context window and take corrective action (e.g., disabling unused browser or database MCP servers).
- Learnings: MCP tool declarations with JSON schemas constitute the vast majority of initial context token usage when multiple integrations are enabled.

### Historical Component Detail: Context Window & Costing Inspector Dialog (Included in 0.1.35-local4-token-usage)

- What / why (1–2 lines): Unified context window and costing inspector popover for Claude Code and Codex harness sessions, detailing token occupancy (system & tools, memory files, skills, messages, autocompact buffer, free space) and live turn / session financial costs.
- Implementation: Upgraded `ContextMeter.tsx` into a rich inspection popover featuring a segmented horizontal bar chart, itemized breakdown categories, expandable Memory Files (`CLAUDE.md`, `MEMORY.md`, `AGENTS.md`) and Skills (`.claude/skills`, `.codex/skills`, `.agents/skills`) with per-item token measurements, plan rate limits (5-hour and weekly reset countdowns via `fetchClaudeRateLimits` / `fetchCodexRateLimits`), and a costing engine in `src/lib/tokenCosting.ts` with model rates (input, cache read/write, output) calculating per-turn spend, cache savings, and cumulative session costs.
- Files touched: `src/lib/tokenCosting.ts`, `src/lib/tokenCosting.test.ts`, `src/chrome/ContextMeter.tsx`, `src/chrome/ContextMeter.test.ts`, `src/chrome/Composer.tsx`, `src/surfaces/SessionPane.tsx`, `docs/context-dialog-plan.md`, `docs/LOCAL-CHANGELOG.md`.
- Verification (commands + results): `npx tsc --noEmit` clean (0 errors); `npx vitest run` 104 passed (1,098 tests passed).
- Caveats / known issues: Third-party CLIs without token telemetry or prompt breakdown (Cursor, Pi, OpenCode) rely on client-side estimation; full telemetry is enabled for Claude and Codex.
- Advantages / tradeoffs: Provides transparent insight into context usage, prompt caching efficiency, and dollar spend without modifying external CLI binaries.
- Learnings: Harness adapters capture wire telemetry from CLIs, while prompt components (memory files and skills) can be accurately discovered and estimated directly from the workspace filesystem.

## Unreleased - 8 Sept 2026 - Gitignored files in chat mentions (Deferred work — not in 0.1.35-local4-token-usage)

- What / why (1-2 lines): useful local files such as
  `docs/LOCAL-CHANGELOG.md` were visible in Explorer but absent from chat `@`
  search because mentions reused Quick Open's Git-aware index. The same file
  could also open root `CHANGELOG.md` due to a filename-suffix collision.
- Implementation: added a separate, cached mention-only file listing. It keeps
  Quick Open unchanged, merges ignored files from a bounded disk scan, checks
  exact Git ignored status using `git check-ignore --stdin -z` (omitting the badge
  in non-Git or error contexts), filters sensitive candidate files via heuristic
  suggestion filters, and labels ignored picker entries visibly and accessibly.
  File-link fallback matching now checks filesystem metadata via `statFiles` so
  explicit paths immediately win over basename heuristics, while requiring a real
  path separator before suffix fallbacks. The `useComposerFiles` hook manages the
  lifecycle: picker open upgrades to mention files, and closing the picker or typing
  retains the upgraded index so selected mentions are preserved without downgrade.
- Files touched: `src-tauri/src/fs.rs`, `src-tauri/src/lib.rs`,
  `src/lib/fs.ts`, `src/lib/fileIndex.ts`, `src/lib/fileIndex.test.ts`,
  `src/lib/fileMentions.ts`, `src/lib/fileMentions.test.ts`,
  `src/chrome/Composer.tsx`, `src/chrome/useComposerFiles.ts`,
  `src/chrome/useComposerFiles.test.ts`, `src/chrome/FileMentionPicker.tsx`,
  and `src/chrome/FileMentionPicker.test.ts`; local plan and logs under `docs/`.
- Verification (commands + results): `npx tsc --noEmit` clean; full
  `npx vitest run` 133 files / 1,415 tests passed; `cargo fmt --check` clean;
  `cargo check` clean; `cargo test mention_files` 3 passed. `npx eslint . --fix`
  exits 1 because the repository has no `eslint.config.*` (tooling blocker).
- Caveats / known issues: Tauri dev-mode behavior still needs user testing.
  `@docs` remains a directory reference, not automatic expansion of every file.
  Likely secret files are intentionally absent from suggestions. No installer
  or installed-build verification was performed.
- Advantages / tradeoffs: ignored local docs become directly selectable without
  changing Git tracking or slowing/changing Quick Open. The first mention scan
  does extra bounded disk work; subsequent opens use the mention cache, and
  known large generated directories are never entered.
- Learnings: Explorer and mentions had different data sources; "visible in the
  tree" never guaranteed "available to chat." File paths must be compared by
  path segments, not raw character suffixes.

## 0.1.35-local4-hari — 8 Sept 2026 — One-button mode switcher + Hari phase-0 board

- What / why (1-2 lines): `Planned.md` #10 + #11. The rail's three-tab mode
  control had Hari permanently disabled and burned a full row on two dead
  tabs; Hari itself had no surface. Replaced the tabs with one cycling
  button and gave Hari a real, AI-free kanban.
- Implementation: `AppMode` gains `"hari"` with a validating loader plus
  `cycleAppMode`/`appModeOrder`. `ModeSwitcher` is now its own component: a
  single button that names the current mode, cycles on click (Shift-click
  and arrow keys reverse), shows three dots for position and an accent dot
  when threads are waiting. `hariBoard.ts` derives four lanes purely from
  live thread state - `sessionNeedsInput()` -> Needs Input, `busy` -> In
  Progress, `queuedMessages` -> Todos, everything else idle-with-a-turn ->
  Done; blank tabs are not cards. `HariView` renders the lanes as a
  read-only board (a lane is a fact about a thread, not a droppable slot),
  reusing `liveAgentsFromSessions` for activity text so a card can never
  disagree with the rail. Hari is a mode, not an overlay, but a fullscreen
  overlay still wins so Settings never stacks on the board.
- Files touched: `src/lib/appearance.ts`, `src/lib/appearance.test.ts`,
  `src/lib/hariBoard.ts` (new), `src/lib/hariBoard.test.ts` (new),
  `src/chrome/ModeSwitcher.tsx` (new), `src/chrome/ProjectRail.tsx`,
  `src/chrome/Sidebar.tsx`, `src/surfaces/HariView.tsx` (new),
  `src/App.tsx`, `docs/hari-mode-plan.md` (new), `docs/Planned.md`,
  + 5 version files (manual bump; `bump-version.mjs` rejects suffixes).
- Verification (commands + results): `npx tsc --noEmit` clean; full
  `npx vitest run` 131 files / 1401 tests green (17 new: 13 board, 4 mode);
  `npm run build` (tsc + vite) clean. ESLint still unavailable repo-wide
  (no flat config, pre-existing - see the local3 entry); `prettier --check`
  drift in `App.tsx`/`Sidebar.tsx` is pre-existing and was left alone
  rather than reformatted as churn.
- Installer: `target/release/bundle/nsis/MonoCode_0.1.35-local4-hari_x64-setup.exe`
  (NSIS-only; MSI rejects text suffixes), 9,366,618 bytes,
  SHA256 56CB9206CBC5FCD30411397C52BDD46605AD5836B848279D44CA0A8262627806.
  Rust compiled in 1m23s (warm `target/`); `cargo fmt --check` clean. The
  usual updater-signature error at the end is post-bundle and pre-existing -
  the installer was already written, and the command exited 0.
- Caveats / known issues: the board covers **open threads only** (live
  sessions across tabs), not history - stated in the empty state rather
  than hidden. No drag between lanes, by design. No `session.error` source
  for Needs Input yet.
- Advantages / tradeoffs: the button costs a third of the tab row's width
  and no longer shows dead pixels; the cost is discoverability, paid back
  with the current-mode face, position dots and a next-mode tooltip. The
  board needed zero backend and zero AI - every lane is state the app was
  already tracking for the rail's live-agent preview.
- Learnings: deriving lanes from existing state (rather than storing a
  board) removes a whole class of drift bugs, and it is what forces the
  board to be read-only. Frontend-only work is also the one kind that
  survives a near-full disk: no worktree, no second `target/`.

## 0.1.35-local3-reveal-tabs — 8 Sept 2026 — Explorer reveal fix + tab-strip fade

- What / why (1–2 lines): kill the false `Could not reveal in File
  Explorer` error; keep the tab scroll buttons and add a per-side edge fade
  so hidden tabs are discoverable without a hard cutoff.
- Implementation: Windows `reveal_path` now dispatches Explorer via
  `spawn()` + `CREATE_NO_WINDOW` — success means dispatched, only a spawn
  failure is an error; macOS/Linux untouched. `TitleBar`: original
  `TabStripChevron` + `scrollTabsBy` restored verbatim, new
  `tabStripFadeMask` (mask-image + -webkit prefix as literal Tailwind
  arbitrary classes) driven by per-side overflow tracking.
- Files touched: `src-tauri/src/fs.rs`, `src/chrome/TitleBar.tsx`,
  `src/chrome/TitleBar.test.ts`, + 5 version files (`package.json`,
  `package-lock.json` x2, workspace `Cargo.toml`, `Cargo.lock`,
  `src-tauri/tauri.conf.json`). (`bump-version.mjs` rejects suffixed
  versions, so the bump was manual.)
- Verification (commands + results): `npx tsc --noEmit` clean; full
  `npx vitest run` 130 files / 1383 tests green;
  `cargo fmt --check` clean; `cargo check` clean;
  `cargo test reveal_path` 3/3 (file Ok, dir Ok — Windows-gated;
  missing-path Err). Repo-wide `npm run check` still blocked by
  pre-existing issues (ESLint 9/10 flat-config, clippy warnings in
  `pty.rs`/`fs.rs`/`harness.rs`, 11 CRLF-only Rust failures in
  `checkpoint.rs`/`fs.rs`) — attributed, untouched.
- Installer: `target/release/bundle/nsis/MonoCode_0.1.35-local3-reveal-tabs_x64-setup.exe`
  (NSIS-only; MSI rejects text suffixes), 9,365,737 bytes,
  SHA256 DCAFDB193C3F1FCEB32001379F8DF27322CF3015733376675C61FA3267D59D5C.
  (Updater-signature warning at bundle time only — same as past local
  builds; installer itself finished.)
- Caveats / known issues: built from a dirty tree that also holds another
  session's unfinished Chat WIP (`ChatPanel.tsx`, `fork.ts`,
  `SessionCard.tsx`, ~30 more files) — this is NOT a clean D+E-only
  build. A/B/C worktrees were cut from clean `437cd34` and lack D+E;
  merge `nakul/windows-support` into them after this lands.
- Advantages / tradeoffs: buttons = obvious affordance, fade = smooth
  cutoff; mask (not overlay) stays correct over glass/wallpaper and adds
  zero hitbox. Tradeoff: scroll + ResizeObserver tracking restored —
  same tiny cost as the original code.
- Learnings: Explorer's exit code after `/select` dispatch is not a result
  (opens fine, exits nonzero); Tailwind arbitrary classes must appear
  literally in source or the scanner skips them; a mask beats an overlay
  on translucent backgrounds.

## 0.1.35-local1-skills — 6 Sept 2026 — Skills build, Defender-clean rename

- What / why: same content as 0.1.34-local1, version renamed so the local
  line reads `0.1.35-*` going forward.
- Implementation: version string only (`package.json`, workspace
  `Cargo.toml`, `tauri.conf.json`).
- Files touched: 3 version files.
- Verification: NSIS bundle produced
  (`MonoCode_0.1.35-local1-skills_x64-setup.exe`, 8.9 MB).
- Caveats: installer filename carries the suffix; in-app version matches it.
- Advantages: no collision with upstream numbers; base + feature visible.
- Learnings: none (rename-only).

## 0.1.34-local1 — 6 Sept 2026 — Runner removed, first clean build

- What / why: prove the Defender flag came from the skill-import command
  runner by shipping the same tree without it.
- Implementation: deleted `run_skill_import` + shell-spawn helpers +
  timeout/output caps (backend), command registration, `runSkillImport`
  bridge, Import button + command panel (Settings). Rest of Skills kept.
  (Also: MSI bundler rejects text prerelease suffixes → local builds are
  NSIS-only via `--bundles nsis`.)
- Files touched: `src-tauri/src/skills.rs`, `src-tauri/src/lib.rs`,
  `src/lib/skills.ts`, `src/surfaces/SettingsView.tsx`.
- Verification: tsc clean, vitest 1324/1324, skills Rust 14/14, fmt/check
  clean. Installed clean — Defender silent. Theory proven.
- Caveats: Skills page cannot install from commands (list/manage only).
- Advantages: shippable build while the runner decision is pending.
- Learnings: `!ml` flags follow behavior (shell-spawning), not identity;
  real-world A/B (0.1.35 vs 0.1.37) beats lab speculation.

## 0.1.37 — 6 Sept 2026 — Skills WIP build (flagged, superseded)

- What / why: first installer containing the Skills page work.
- Implementation: Skills discovery UI + backend as built by the other
  session, including the run-import-command panel.
- Verification: installed fine functionally; Defender quarantined
  `monocode.exe` as `Trojan:Win32/Bearfoos.A!ml` at install time.
- Caveats: DO NOT distribute — superseded by local1. Kept locally only.
- Learnings: unsigned + fresh hash + shell-spawning feature = ML flag.
  Fix on machine: restore from quarantine, exclude install + `target/`
  folders, reinstall. Real fix needs a code-signing cert (upstream call).

## 0.1.36 — 5 Sept 2026 — Migration toggle UX (reconstructed note)

- What / why: session-migration UX round — global Resume|Replay|Custom
  header toggle, conditional replay-target picker, per-row toggles in
  Custom only, `+` menu rows joined to the hover system.
- Verification (as recorded then): tsc clean, migration tests green.
- Caveats: details thin — predates this changelog; see
  `windows-changes.md` "Other changes" roundup.

## 0.1.35 — 5 Sept 2026 — First merged-stack build (reconstructed note)

- What / why: first installer of the upstream-merged Windows stack
  (48 upstream commits + catalog fixes + home fallback + hover system).
- Caveats: details thin — predates this changelog.
