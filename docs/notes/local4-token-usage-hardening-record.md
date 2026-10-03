# 0.1.35-local4-token-usage Hardening Record

> **Notice:** This document is a retrospective closeout record for the combined integration hardening stack. The work was already in progress before the current Working Agreement lifecycle was consistently applied across worktrees; this record documents the scope, architecture decisions, dev/installed issues, and verification retroactively rather than pretending it was authored prior to implementation.

- **Workspace:** `E:\Developing\OpenSource\mono-clone`
- **Branch:** `nakul/windows-support`
- **Dirty-stack base:** `d76ec55a45a39231b823b1daf90d3a2faac548dd`
- **Installed artifact version:** `0.1.35-local4-token-usage`
- **Archived installer:** `E:\Developing\Installable versions\MonoCode_0.1.35-local4-token-usage_x64-setup.exe`
- **SHA-256:** `574A196841539C9F410145A2A40226408FD536B2579885140A8A6FD3A33F0068`

---

## 1. Initial Idea

Harden the Windows direct-integration line across six key UX, editor, telemetry, and git operational areas without regressions:
1. **Windows newline normalization and safe staging:** Prevent malformed CRCRLF blank lines in editor surfaces, eliminate phantom CRLF diffs, and ensure Git clean filters properly normalize files during staging.
2. **Source Control navigation and deleted-file diffs:** Full-row click targets in Source Control, robust staged vs. unstaged focus, opening deleted files safely as read-only Git diff tabs, and portable Windows path matching (`\` vs `/`).
3. **Experimentation settings, Detailed Context, and Remaining Quota:** Settings → Experimentation page hosting toggles for Detailed Context (default OFF with compact two-line meter) and Remaining Quota (default OFF, displaying `XX% left` instead of consumed quota).
4. **Telemetry lifecycle and costing correctness:** Preserve latest-turn token telemetry after completion, calculate cumulative session usage, avoid active-turn double counting, and ensure steering messages do not usurp turn ownership or duration metrics.
5. **Composer Queue/Steer keyboard behavior:** Unify Composer key bindings (Shift+Enter inserts newline, Enter triggers configured Queue/Steer action while busy, Ctrl/Cmd+Enter triggers the alternate action), integrate suggestion completions via a single production decision boundary, ignore IME composition, and update send button tooltips dynamically.
6. **Shared-hover continuity and consumer integrations:** Maintain continuous shared hover pill transitions across intentional list item gaps across Sidebar, Inbox filters, Chats, Sidechats, and Notes; stop transitions at section dividers/folders; preserve selected-row backgrounds; and add cache-first flicker reduction in NotesView using `peekNotes()`.

---

## 2. Research

- **Windows Git Line Endings:** On Windows, Git checkouts may produce CRLF while internal CodeMirror and diff algorithms expect LF. When saving or staging, improper byte handling creates CRCRLF double-carriage returns or status phantoms where `git status` reports modified but `git diff` is empty. Path-aware clean filters and internal LF canonicalization solve this reliably.
- **Deleted File Inspection:** Previously, clicking a deleted file in Source Control attempted a normal filesystem open via `newFileTab`, which failed because the file no longer existed on disk. Opening via `newGitDiffTab` with `isDeleted` awareness allows inspecting the deleted file against HEAD in read-only mode.
- **Provider Telemetry Differences:** Claude CLI and Codex app-server report usage over JSON/JSON-RPC differently. Claude emits `result.usage` while Codex emits `thread/tokenUsage/updated`. Interleaving user steering messages previously reset `liveTurnUsage` or attributed duration incorrectly.
- **Keyboard Navigation in Suggestion Dropdowns:** Multiple independent keydown handlers in Composer led to conflicting behaviors where pressing Enter when no suggestion matched would clear or misroute input. A single state machine (`resolveEffectiveSuggestionAction`) provides consistent behavior across Slash and Mention pickers.
- **Shared Hover Motion:** Floating pills across list items flickered or reset when moving across CSS `gap` intervals. Adding `data-shared-hover-continuity` containers with bounding rect unioning allows smooth animation across list gaps while isolating distinct sections.

---

## 3. Discussion

- **Settings Surface Placement:** Putting Detailed Context and Remaining Quota directly into general settings or having them always-on overwhelmed users who prefer clean, minimalist interfaces. Introducing the `Experimentation` section gives early access while keeping defaults unobtrusive.
- **Staging and Rust Backend Safety:** File staging commands in `src-tauri/src/fs.rs` must invoke git with proper `.gitattributes` clean filter emulation so staged blobs match what native `git add` produces.
- **Working Tree Diff Preservation:** When navigating between staged and unstaged diffs of modified or deleted files, workspace tab state and scroll position must remain stable.

---

## 4. Implementation Plan

1. **Editor & Git Staging (`fs.rs`, `lineEndings.ts`, `editorDoc.ts`, `editorGit.ts`):**
   - Canonicalize editor content to LF internally.
   - Detect existing line endings and preserve CRLF on save when configured.
   - Implement path-aware clean filter hashing in Tauri Rust backend.
2. **Source Control Navigation (`App.tsx`, `GitChangesPanel.tsx`, `WorkingTreeDiff.tsx`, `GitFileDiffView.tsx`):**
   - Widen click hitboxes to full row.
   - Dispatch `newGitDiffTab` for deleted files.
   - Normalize path separators for Windows drive letters and case sensitivity.
3. **Experimentation & Context Meter (`SettingsView.tsx`, `SettingsRail.tsx`, `settings.ts`, `ContextMeter.tsx`, `rateLimits.ts`, `tokenCosting.ts`):**
   - Add Experimentation section in Settings.
   - Implement `detailedContext` and `remainingQuota` persistent stores and window events.
   - Render compact two-line summary when detailed context is OFF; full inspector when ON.
4. **Token Accounting & Lifecycle (`apply.ts`, `tokenAccounting.ts`, `SessionPane.tsx`):**
   - Compute `latestTurnProcessedUsage` and `sessionProcessedUsage`.
   - Keep turn ownership on original turn when steering messages are appended.
5. **Composer Action Routing (`Composer.tsx`, `composerAction.ts`):**
   - Implement pure action resolver for Enter / Shift+Enter / Ctrl+Enter with busy states and suggestion popovers.
   - Expose dynamic aria-labels and tooltips on Send/Queue/Steer button.
6. **Shared Hover System (`SharedHoverHighlight.tsx`, `Sidebar.tsx`, `ChatPanel.tsx`, `NotesView.tsx`, `InboxView.tsx`):**
   - Container-level continuity tracking across list items.
   - Cache-first initialization in `NotesView.tsx` with `peekNotes()`.

---

## 5. Todos

- [x] Windows newline canonicalization and clean-filter staging tests
- [x] Deleted-file diff tab opening and Source Control row layout
- [x] Settings → Experimentation UI with Detailed Context and Remaining Quota toggles
- [x] ContextMeter compact two-line fallback and detailed inspector modes
- [x] Remaining quota percentage formatting (`XX% left`) across ContextMeter and UsageFooter
- [x] Telemetry turn retention and cumulative session costing without steering double-counting
- [x] Composer action resolution state machine and keybinding tests
- [x] Shared-hover continuity across Sidebar, Inbox, Chats, and Notes lists
- [x] Cache-first NotesView loading via `peekNotes()`
- [x] Full automated test suite green (Vitest 150/150 files, 1595/1595 tests)
- [x] Full Rust check clean (cargo fmt, clippy, cargo test 221/221 tests)
- [x] Installed NSIS package manual verification

---

## 6. Issues in Dev (+ fixes)

- **Status phantom in Cargo.toml:** Line ending difference caused `src-tauri/Cargo.toml` to report modified in git status with zero diff lines. Resolved by verifying zero diff and restoring worktree bytes from HEAD.
- **Model pricing specificity:** o3 vs o3-mini regex collisions resolved by sorting model keys by descending length before matching.
- **Suggestion Enter clash:** Unmatched queries in slash commands needed explicit fallthrough behavior without swallowing Enter or closing bare `/`. Resolved in `composerAction.ts`.
- **Deleted file navigation crash:** Attempting to read deleted file bytes from disk threw filesystem errors. Resolved by opening Git diff view directly using HEAD contents.

---

## 7. Issues in Installed (+ fixes)

- **Detailed context visual weight:** Full breakdown inspector was overwhelming when displayed by default. Added `Detailed context` setting in Experimentation section (default OFF), falling back to clean two-line summary.
- **Quota percent clarity:** Users found consumed percentage ambiguous. Added `Remaining quota` setting in Experimentation section (default OFF) to switch to `XX% left` display.
- **Notes list flicker on initial open:** Populating notes from asynchronous DB query caused empty state flash. Added `peekNotes()` synchronous cache initialization in `NotesView.tsx`.
- **Shared hover jumping across items:** Gaps between cards caused highlight pill to collapse and re-expand. Added `data-shared-hover-continuity` parent wrapper.
- **Installed runtime verdict:** Verified working in installed NSIS build `MonoCode_0.1.35-local4-token-usage_x64-setup.exe`.

---

## 8. Learnings

- Platform newline hygiene must be enforced at both the UI editor boundary (LF canonicalization) and the git storage boundary (clean filter staging) to prevent phantom diffs on Windows.
- Multi-concern files like `Composer.tsx`, `SessionPane.tsx`, and `settings.ts` require disciplined separation during commit slicing to maintain bisectability and logical coherence.
- Synchronous memory cache peek (`peekNotes()`) alongside asynchronous database refresh eliminates UI layout shift in desktop client navigation.

---

## 9. Done

- All six hardening areas implemented, verified, and manually tested in installed runtime.
- Automated gates: 150 Vitest test files (1,595 tests) passed; Rust cargo test (221 tests) passed; TypeScript clean.
- Packaged as `0.1.35-local4-token-usage`.
- Status: **Done**.
