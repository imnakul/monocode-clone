# Stage 4 — Conflicts and risks

Verified: 80 actual paths assigned exactly once to 27 C groups; 231 textual marker hunks (modify/delete paths have zero marker hunks). Hunk count/size measured by scripts/conflict-evidence.py. S ≤30, M 31–150, L >150 combined side lines; size is textual load, not duration. `scripts/hunk-review.md` was read for every hunk; full side diffs are retained in evidence JSON. Recommendations are **Inferred** from source seams, provisional until owner decisions and checks. No conflict was resolved.

## Summary

| ID | Paths | Class | Hunks / size | Recommendation |
|---|---|---|---|---|
| C-01 Version label and generated manifests | `Cargo.lock`; `Cargo.toml`; `package-lock.json`; `package.json`; `src-tauri/tauri.conf.json` | mechanical | 6 / S (12 side lines) | Choose one owner-approved local label; preserve Windows no-sign+NSIS+archive script and union approved upstream scripts/deps. Regenerate affected lock metadata with package-manager tooling; never hand-edit lockfiles. |
| C-02 Windows native plumbing | `src-tauri/src/fs.rs`; `src-tauri/src/lib.rs`; `src-tauri/src/main.rs`; `src-tauri/src/search.rs`; `src-tauri/src/window.rs` | weave | 8 / L (192 side lines) | Union module/command lists once; keep AtomicU64 and AtomicBool, mpsc/thread/AppHandle/Uuid. Keep ensure_scratch_chat alongside generated-image functions. Run askpass exit check and ACP-auth URL check as independent early exits. Preserve Windows preparation before returning upstream WebviewWindow; retain reveal conditional focus. Build cancellable search command through hidden process helper rather than losing console suppression. |
| C-03 Provider binary authority | `src-tauri/src/harness.rs`; `src/integrations/harness/core/child.ts` | new product question | 9 / L (845 side lines) | Keep backend canonical resolution and Windows resolved_binary_matches; extend configured resolver with Cline and ACP. Preserve hide_console_window/isolate_child/terminate/job code while adding Unix retry and exec_output. Do not substitute raw Command::new for Windows-aware provider command. D-04 chooses one stored override authority. |
| C-04 Discovery and model picker | `src/integrations/harness/core/availability.ts`; `src/features/sessions/ui/ModelPicker.tsx`; `src/integrations/harness/providers/claude/claudeCatalog.ts`; `src/integrations/harness/providers/codex/codexCatalog.ts` | weave | 11 / L (170 side lines) | Move local evidenced/error state into one authoritative availability store; include Cline in its Record. Compose project-hidden filters with local per-provider evidence. Local source refresh must still exclude ACP blanket probes; remote source refresh may use host. Keep Claude default/resolved-model fallback and upstream claudeLaunchId concrete IDs. Use distinct Codex probe IDs and upstream configured binary parameters with local exit code/timeout reporting. |
| C-05 Session SQL and bounded search | `src-tauri/src/session_store.rs` | weave | 3 / M (135 side lines) | Keep current migration lineage through18 and all queue fields in INSERT/SELECT/mapper. Adapt search_sessions_sql to candidate cwd matching (not a single exact cwd), bind budget/limit/cancellation parameters correctly and retain ID dedup. Keep new search budget/truncation behavior; do not restore obsolete SearchRow if unused. |
| C-06 Application lifecycle and send ownership | `src/app/App.tsx` | weave | 10 / M (150 side lines) | Compose sendTurn with exactly one runNativeBranchSend: build Operator/CI prompt first, then fork wrapper, retain humanAuthored. Keep local queue scheduler and terminal start/forget/kill on every close/removal path; add remote history retention independently. Route local approval scope and remote approval separately without advertising unsupported remote session scope. Retain local flexible diff options while adapting upstream pin/kind. |
| C-07 Shell navigation and compact drawer | `src/app/shell/MenuBar.tsx`; `src/app/shell/ProjectRail.tsx`; `src/app/shell/Sidebar.tsx` | weave | 7 / L (267 side lines) | Union menu imports. Use upstream useProjectMenu rather than duplicate old menu builder, preserving local mode/hover attributes at callers. Keep mode=chat overlay guards and shared highlight. Add upstream drawer only to project sidebar branch; retain mount/performance and remote behavior. Never hide menu behind Alt. |
| C-08 Usage presentation | `src/app/shell/UsageFooter.tsx`; `src/app/shell/UsageProviderChip.tsx`; `src/features/providers/model/rateLimits.test.ts` | new product question | 4 / M (67 side lines) | Union React hooks/types and presentation prop; avoid computing remaining twice. D-06 determines whether local toggle remains meaningful or upstream remaining default replaces it. Preserve quota clamp/round tests and exhaustedWindowResetAt tests in separate describes. |
| C-09 CRLF editor lifecycle | `src/features/files/editor/editorDoc.test.ts`; `src/features/files/ui/FileEditor.tsx` | weave | 7 / M (135 side lines) | Keep EditorDiskSession as serializer; adopt gitDiffFiles staged/unstaged decision so true unstaged changes are not hidden by logical equality. Upstream normalization helpers must use the existing shared LineEnding type (R-03). Preserve diskSessionRef serializeForSave/serializeForStage and both test families; add autosave/format/CRLF/disk-conflict matrix. |
| C-10 File pane loading and filesystem bridge | `src/features/files/ui/FilePane.tsx`; `src/platform/tauri/fs.test.ts` | weave | 2 / S (30 side lines) | Use upstream lazySurface/Suspense structure for shared viewers while retaining GitFileDiffView route for local diff tabs; preserve terminal branch. Union pickFolders and wallpaper test imports without replacing mocks or deleting assertions. |
| C-11 Pull review and CI repair | `src/features/inbox/ui/InboxView.tsx`; `src/features/inbox/ui/InboxView.test.ts` | weave | 8 / S (23 side lines) | Carry onPullReview and repairSessions/onRepairChecks through every parent/detail component signature and JSX call; keep both InboxView and inboxStatusMark test imports. Preserve distinct review report vs CI prompt fields. |
| C-12 Notes restore and refresh | `src/features/notes/ui/NotesView.tsx` | weave | 1 / S (17 side lines) | Adopt upstream initializer that validates remembered selection against current notes, keep local loading/error and hover attributes; preserve notes-changed subscription. |
| C-13 Conversation persistence | `src/features/sessions/data/sessionStore.ts`; `src/features/sessions/data/sessionStore.test.ts`; `src/features/sessions/model/session.ts` | weave | 10 / L (470 side lines) | Union optional fields and sanitizers; preserve sanitizeBranchOrigin and review alongside sanitizeNestedId/generated image/BTW routines. Keep providerForkPoint on users; retain ciContext and intent/monocode separately. Remote host-owned sessions stay out of local persistence; local queues remain persisted (correct misleading upstream in-memory comment). Never weaken identity validation. |
| C-14 Durable queue and usage limits | `src/features/sessions/model/messageQueue.ts`; `src/features/sessions/model/messageQueue.test.ts` | weave | 2 / S (24 side lines) | Single canDispatchQueuedHead checks busy, usageLimit, paused/resuming/steering/held, preparing handoff and edited head. Preserve both held-failure and usage-limit tests; resume-at-reset must not release independent local held/paused reasons. |
| C-15 Answer actions and side conversations | `src/features/sessions/ui/AgentTranscript.tsx`; `src/features/sessions/ui/AgentTranscript.test.ts`; `src/features/sessions/ui/SessionPane.tsx`; `src/features/workspace/ui/PaneTree.tsx` | new product question | 7 / L (189 side lines) | Keep scope-aware onApproval and McpFormReply through every layer, branch divider tests and all five BTW callbacks if D-01 accepts BTW. D-01 chooses which user-facing Sidechat/BTW actions coexist. Add backgroundTasks to scope-aware transcript props rather than reverting approval signature. Remote session rendering has explicit unsupported feature policy (D-03). |
| C-16 Composer routing | `src/features/sessions/ui/Composer.tsx`; `src/features/sessions/ui/Composer.test.ts` | standing call | 13 / L (786 side lines) | Standing call NOTES §0.1 and archive 2026-09-23: retain canSteer/actionTooltip/actionAriaLabel/handleActionClick/executeComposerAction and dual Stop+send. Parse MCP/mode/BTW before selected local send/queue/steer dispatch, carry text/attachments/intents exactly once. Keep form priority and deterministic FileReader mock. Do not adopt allowBusySubmit stop-replacement branch. |
| C-17 Appearance and settings | `src/features/settings/model/appearance.ts`; `src/features/settings/model/settings.test.ts`; `src/features/settings/ui/SettingsView.tsx`; `src/styles/index.css` | weave | 23 / L (777 side lines) | Union platform/color/storage imports. Keep all local initial appearance applications and stable Popover wash; carry upstream Linux/native theme options. Render AI helper and Editor groups separately. Compose provider scope controls with initialLoading/Recheck; D-02 selects updater UI, D-04 override store. Segmented options support disabled/title/description plus icon. Haze remains chat-only unless D-08 approves wallpaper support. |
| C-18 Changes review scope and line diff | `src/features/source-control/model/unifiedDiff.ts`; `src/features/source-control/ui/SourceControl.tsx`; `src/features/source-control/ui/WorkingTreeDiff.tsx` | weave | 3 / S (13 side lines) | Union decodeLineEndings and LINE_DIFF_CONFIG imports; preserve normalizing input and use upstream line diff config. Thread staged/unstaged kind through Open All Changes; preserve focusPath without making section refresh lose selected file. Update direct consumers together. |
| C-19 Commit/PR helper and cancellation | `src/features/source-control/ui/GitChangesPanel.tsx`; `src/features/source-control/ui/GitChangesPanel.test.ts`; `src/features/source-control/ui/SwitchBranchDialog.tsx`; `src/features/source-control/ui/SwitchBranchDialog.test.ts` | new product question | 20 / L (380 side lines) | D-07 parameter: keep generateHelperCommitMessage/generateHelperPrContent for local calls with AbortSignal; adopt cancel UI and duplicate-generation guard, preserve startText comparison and helperFailureMessage. Remote content uses remote API; do not send remote cwd to local helper. Keep both add/add test suites after reconciling mocks once. |
| C-20 Workspace serialization and preview scope | `src/features/workspace/model/layout.ts`; `src/features/workspace/model/workspaceSnapshot.ts`; `src/features/workspace/model/workspaceSnapshot.test.ts` | weave | 6 / M (58 side lines) | Union import lists; keep !file.diff in reusable editor predicate if local special diff viewer is retained. Validate diff/focusKind and remoteFile independently; remoteOwner maps remote paths, else apply repairLegacyEncodedDriveColon. model=stub.model||session.model avoids blank legacy models without catalog normalization. |
| C-21 Telemetry reducer | `src/integrations/harness/core/apply.ts` | weave | 3 / S (22 side lines) | stopStreaming(session,endedAt=Date.now()) clears backgroundTasks and stamps local token usage before duration using active turn owner; keep findTurnOwnerIndex separate from stampTurnDuration(blocks,endedAt). Do not stamp most-recent internal synthetic user as owner. |
| C-22 Harness interface union | `src/integrations/harness/core/registry.ts`; `src/integrations/harness/core/registry.test.ts`; `src/integrations/harness/index.ts` | weave | 7 / L (174 side lines) | Keep HelperPromptInput/runHelperPrompt and TextPromptInput/runTextPrompt as distinct contracts; union adapter fields/exports and isolated cancellation. Do not route helper callers into general read-only tool-capable BTW by default (D-07). Extend tests to Cline explicit support/unsupported behavior rather than dropping its provider key. |
| C-23 Removed upstream Antigravity provider | `src/integrations/harness/providers/antigravity/antigravity.ts`; `src/integrations/harness/providers/antigravity/antigravityCatalog.ts`; `src/integrations/harness/providers/antigravity/antigravityLive.test.ts`; `src/integrations/harness/providers/antigravity/antigravityProtocol.test.ts` | standing call | 0 / S (0 side lines) | NOTES §0.3 / archive 2026-09-23 round2.1: retain deletion of these paths. Port relevant configurable-binary/clipboard tests into core ACP tests after verifying native contract. Repair host/providers import before remote host builds; do not resurrect AntigravityBinary/antigravity_args or duplicate command. |
| C-24 Claude live provider union | `src/integrations/harness/providers/claude/claude.ts`; `src/integrations/harness/providers/claude/claudeAdapter.ts`; `src/integrations/harness/providers/claude/claudeLive.test.ts`; `src/integrations/harness/providers/claude/claudeProtocol.test.ts` | weave | 9 / L (173 side lines) | Union Live fields, task/grant maps and resets; keep delayed providerBound with reported fork ID. Preserve live model/permission controls and grant liveness checks; add pendingAssistantBoundary and background/task logic. Keep runHelperPrompt plus runTextPrompt/stopTextPrompt adapter methods. Union tests, not one test file per side. |
| C-25 Codex live provider union | `src/integrations/harness/providers/codex/codex.ts`; `src/integrations/harness/providers/codex/codexAdapter.ts`; `src/integrations/harness/providers/codex/codexElicitation.test.ts`; `src/integrations/harness/providers/codex/codexLive.test.ts`; `src/integrations/harness/providers/codex/codexProtocol.ts` | weave | 13 / L (219 side lines) | Use emittedAssistantByItem/emittedReasoningByItem but retain threadBaseline/lastThreadTotal/turnUsage and inProgressMcpTools resets. In elicitation handler call codexMcpConfirmation with parent candidates; broaden only non-plan Full Access confirmation acceptance, then non-plan stored grant path, then explicit confirmation/form UI. Remove stale isCodexComputerUseAccessConfirmation import/call. Retain session grant liveness and form validation. Union protocol tokenUsage with usageLimited/rateLimits fields. |
| C-26 Isolated helper versus read-only text runners | `src/integrations/harness/providers/claude/claudeText.ts`; `src/integrations/harness/providers/codex/codexText.ts`; `src/integrations/harness/providers/opencode/opencodeText.ts`; `src/integrations/harness/providers/opencode/opencodeText.test.ts`; `src/integrations/harness/providers/opencode/opencodeAdapter.ts` | new product question | 37 / L (702 side lines) | D-07 must keep isolated helper semantics. Add explicit helper isolation mode or retain a dedicated helper runner; noTools/max-turn/deny-all and outputSchema persist only for helper calls, upstream read-only BTW stays separate. Include isolation in reuse key so a tool-enabled runtime cannot serve helper calls. Carry AbortSignal cleanup and thread resume/settings logic without broadening helper permissions. |
| C-27 Windows PTY event offsets | `src/platform/tauri/pty.ts`; `src/platform/tauri/pty.test.ts` | weave | 2 / S (16 side lines) | decodePtyChunk first; on null do not change bytesSeen or invoke handler. On valid chunk preserve start offset, update bytesSeen and pass offset to handler/pushBuffered. Union decode tests with replay/unsupported notification tests. |

## C-01 — Version label and generated manifests
- Local: local5 suffix and Windows installer/archive script.
- Upstream: release versions and host/rpm scripts/dependencies.
- Trace: U-007, U-017, U-019, U-023, U-030, U-042, U-049, U-063, U-067, U-072, U-073, U-075, U-076, U-085, U-094; L-09, L-13, L-14, L-17.
- Class: mechanical; 6 hunks; S.
- Taking local whole loses: release versions and host/rpm scripts/dependencies.
- Taking upstream whole loses: local5 suffix and Windows installer/archive script.
- Recommended (Inferred): Choose one owner-approved local label; preserve Windows no-sign+NSIS+archive script and union approved upstream scripts/deps. Regenerate affected lock metadata with package-manager tooling; never hand-edit lockfiles.
- Existing verification suites / missing cases: No behavior unit test; exact six version locations and build commands.
- Confidence: Medium for integration design; High for exact hunk/path evidence. Not checked: compilation, tests or runtime; largest full-contract audits remain below.

| Exact path | Verified marker lines in scratch merged blob | Side-diff evidence |
|---|---|---|
| `Cargo.lock` | 2345 | local 13 / upstream 485 lines; full text in conflict-evidence.json keyed by path |
| `Cargo.toml` | 7 | local 9 / upstream 9 lines; full text in conflict-evidence.json keyed by path |
| `package-lock.json` | 3, 13 | local 14 / upstream 22 lines; full text in conflict-evidence.json keyed by path |
| `package.json` | 4 | local 9 / upstream 31 lines; full text in conflict-evidence.json keyed by path |
| `src-tauri/tauri.conf.json` | 4 | local 16 / upstream 23 lines; full text in conflict-evidence.json keyed by path |

## C-02 — Windows native plumbing
- Local: scratch-chat/wallpaper/import/ACP commands, hidden process spawning, acrylic preparation.
- Upstream: generated-image/search/clipboard/remote registrations; askpass; macOS Quick windows; Linux glass.
- Trace: U-006, U-007, U-008, U-009, U-010, U-012, U-013, U-017, U-019, U-020, U-023, U-028, U-029, U-030, U-031, U-045, U-050, U-054, U-058, U-064, U-066, U-074, U-075; L-03, L-04, L-09, L-13, L-14, L-15, L-16, L-19, L-27.
- Class: weave; 8 hunks; L.
- Taking local whole loses: generated-image/search/clipboard/remote registrations; askpass; macOS Quick windows; Linux glass.
- Taking upstream whole loses: scratch-chat/wallpaper/import/ACP commands, hidden process spawning, acrylic preparation.
- Recommended (Inferred): Union module/command lists once; keep AtomicU64 and AtomicBool, mpsc/thread/AppHandle/Uuid. Keep ensure_scratch_chat alongside generated-image functions. Run askpass exit check and ACP-auth URL check as independent early exits. Preserve Windows preparation before returning upstream WebviewWindow; retain reveal conditional focus. Build cancellable search command through hidden process helper rather than losing console suppression.
- Existing verification suites / missing cases: fs reveal tests; ACP tests; window/search tests; manual zero-console check separate.
- Confidence: Medium for integration design; High for exact hunk/path evidence. Not checked: compilation, tests or runtime; largest full-contract audits remain below.

| Exact path | Verified marker lines in scratch merged blob | Side-diff evidence |
|---|---|---|
| `src-tauri/src/fs.rs` | 5, 29, 5485 | local 388 / upstream 1532 lines; full text in conflict-evidence.json keyed by path |
| `src-tauri/src/lib.rs` | 3, 483 | local 151 / upstream 203 lines; full text in conflict-evidence.json keyed by path |
| `src-tauri/src/main.rs` | 4 | local 13 / upstream 18 lines; full text in conflict-evidence.json keyed by path |
| `src-tauri/src/search.rs` | 174 | local 8 / upstream 469 lines; full text in conflict-evidence.json keyed by path |
| `src-tauri/src/window.rs` | 121 | local 37 / upstream 212 lines; full text in conflict-evidence.json keyed by path |

## C-03 — Provider binary authority
- Local: case-insensitive validated override paths, hidden helpers/job cleanup, Cline and official ACP resolver.
- Upstream: configured-provider binary paths/args, remote backend abstraction, updater exec output, Unix busy-binary retry.
- Trace: U-013, U-023, U-029, U-030, U-050, U-053; L-03, L-04, L-13, L-17.
- Class: new product question; 9 hunks; L.
- Taking local whole loses: configured-provider binary paths/args, remote backend abstraction, updater exec output, Unix busy-binary retry.
- Taking upstream whole loses: case-insensitive validated override paths, hidden helpers/job cleanup, Cline and official ACP resolver.
- Recommended (Inferred): Keep backend canonical resolution and Windows resolved_binary_matches; extend configured resolver with Cline and ACP. Preserve hide_console_window/isolate_child/terminate/job code while adding Unix retry and exec_output. Do not substitute raw Command::new for Windows-aware provider command. D-04 chooses one stored override authority.
- Existing verification suites / missing cases: harness Windows resolver tests; child.test.ts; ACP/Cline live tests; new legacy-override migration test.
- Confidence: Medium for integration design; High for exact hunk/path evidence. Not checked: compilation, tests or runtime; largest full-contract audits remain below.

| Exact path | Verified marker lines in scratch merged blob | Side-diff evidence |
|---|---|---|
| `src-tauri/src/harness.rs` | 79, 1444, 1525, 1855, 3212, 5336 | local 2279 / upstream 1142 lines; full text in conflict-evidence.json keyed by path |
| `src/integrations/harness/core/child.ts` | 1, 345, 478 | local 81 / upstream 268 lines; full text in conflict-evidence.json keyed by path |

## C-04 — Discovery and model picker
- Local: per-provider evidence and lazy ACP handshake, Cline tab, timeout/exit catalog reporting and resolved Claude default alias.
- Upstream: shared availability state, per-project visibility, remote model source, configured binary options, version-native Claude IDs.
- Trace: U-004, U-008, U-012, U-013, U-023, U-033, U-069; L-18.
- Class: weave; 11 hunks; L.
- Taking local whole loses: shared availability state, per-project visibility, remote model source, configured binary options, version-native Claude IDs.
- Taking upstream whole loses: per-provider evidence and lazy ACP handshake, Cline tab, timeout/exit catalog reporting and resolved Claude default alias.
- Recommended (Inferred): Move local evidenced/error state into one authoritative availability store; include Cline in its Record. Compose project-hidden filters with local per-provider evidence. Local source refresh must still exclude ACP blanket probes; remote source refresh may use host. Keep Claude default/resolved-model fallback and upstream claudeLaunchId concrete IDs. Use distinct Codex probe IDs and upstream configured binary parameters with local exit code/timeout reporting.
- Existing verification suites / missing cases: ModelPicker.test.ts 440/442; availability.test.ts; models/ClaudeCatalog tests; new split-store regression.
- Confidence: Medium for integration design; High for exact hunk/path evidence. Not checked: compilation, tests or runtime; largest full-contract audits remain below.

| Exact path | Verified marker lines in scratch merged blob | Side-diff evidence |
|---|---|---|
| `src/integrations/harness/core/availability.ts` | 61, 94, 289 | local 124 / upstream 89 lines; full text in conflict-evidence.json keyed by path |
| `src/features/sessions/ui/ModelPicker.tsx` | 37, 232, 371, 468, 1483 | local 51 / upstream 279 lines; full text in conflict-evidence.json keyed by path |
| `src/integrations/harness/providers/claude/claudeCatalog.ts` | 407, 423 | local 88 / upstream 148 lines; full text in conflict-evidence.json keyed by path |
| `src/integrations/harness/providers/codex/codexCatalog.ts` | 82 | local 198 / upstream 131 lines; full text in conflict-evidence.json keyed by path |

## C-05 — Session SQL and bounded search
- Local: Windows cwd candidate matching/dedup and v14 queue reconciliation; persisted queue columns.
- Upstream: cancellable read-only bounded search, generated-image cleanup lifecycle and restored index checks.
- Trace: U-020, U-064, U-074, U-075, U-076; L-05.
- Class: weave; 3 hunks; M.
- Taking local whole loses: cancellable read-only bounded search, generated-image cleanup lifecycle and restored index checks.
- Taking upstream whole loses: Windows cwd candidate matching/dedup and v14 queue reconciliation; persisted queue columns.
- Recommended (Inferred): Keep current migration lineage through18 and all queue fields in INSERT/SELECT/mapper. Adapt search_sessions_sql to candidate cwd matching (not a single exact cwd), bind budget/limit/cancellation parameters correctly and retain ID dedup. Keep new search budget/truncation behavior; do not restore obsolete SearchRow if unused.
- Existing verification suites / missing cases: session_store queue migration/round-trip/Windows history tests; bounded search tests; new combined search+legacy-drive fixture.
- Confidence: Medium for integration design; High for exact hunk/path evidence. Not checked: compilation, tests or runtime; largest full-contract audits remain below.

| Exact path | Verified marker lines in scratch merged blob | Side-diff evidence |
|---|---|---|
| `src-tauri/src/session_store.rs` | 1366, 1479, 1582 | local 1064 / upstream 921 lines; full text in conflict-evidence.json keyed by path |

## C-06 — Application lifecycle and send ownership
- Local: scratch Chat, terminal cleanup, queue scheduler, review/Sidechat, native fork send flow, forms/session approvals and human-origin flag.
- Upstream: remote sessions, preview tabs, BTW, Operator, usage-limit resumes, multi-project opening, CI repairs, lazy UI.
- Trace: U-004, U-005, U-006, U-007, U-008, U-009, U-011, U-012, U-015, U-016, U-018, U-019, U-020, U-022, U-023, U-028, U-029, U-030, U-036, U-038, U-046, U-055, U-062, U-083, U-093, U-096, U-097, U-098; L-02, L-03, L-07, L-19, L-20, L-23, L-25, L-28.
- Class: weave; 10 hunks; M.
- Taking local whole loses: remote sessions, preview tabs, BTW, Operator, usage-limit resumes, multi-project opening, CI repairs, lazy UI.
- Taking upstream whole loses: scratch Chat, terminal cleanup, queue scheduler, review/Sidechat, native fork send flow, forms/session approvals and human-origin flag.
- Recommended (Inferred): Compose sendTurn with exactly one runNativeBranchSend: build Operator/CI prompt first, then fork wrapper, retain humanAuthored. Keep local queue scheduler and terminal start/forget/kill on every close/removal path; add remote history retention independently. Route local approval scope and remote approval separately without advertising unsupported remote session scope. Retain local flexible diff options while adapting upstream pin/kind.
- Existing verification suites / missing cases: queueDurability/sessionRemoval/terminalPanes; branchFlow and handoff tests; operator/usage-limit tests; new combined lifecycle regression.
- Confidence: Medium for integration design; High for exact hunk/path evidence. Not checked: compilation, tests or runtime; largest full-contract audits remain below.

| Exact path | Verified marker lines in scratch merged blob | Side-diff evidence |
|---|---|---|
| `src/app/App.tsx` | 108, 335, 1174, 2710, 3409, 3794, 3872, 6444, 7254, 9248 | local 1218 / upstream 3278 lines; full text in conflict-evidence.json keyed by path |

## C-07 — Shell navigation and compact drawer
- Local: always-visible menu, SharedHoverHighlight, ChatPanel routing and local project menu.
- Upstream: custom keys/autosave menu; extracted useProjectMenu; drawer and remote projects.
- Trace: U-001, U-005, U-012, U-023, U-026, U-028, U-055, U-073, U-074, U-098; L-09.
- Class: weave; 7 hunks; L.
- Taking local whole loses: custom keys/autosave menu; extracted useProjectMenu; drawer and remote projects.
- Taking upstream whole loses: always-visible menu, SharedHoverHighlight, ChatPanel routing and local project menu.
- Recommended (Inferred): Union menu imports. Use upstream useProjectMenu rather than duplicate old menu builder, preserving local mode/hover attributes at callers. Keep mode=chat overlay guards and shared highlight. Add upstream drawer only to project sidebar branch; retain mount/performance and remote behavior. Never hide menu behind Alt.
- Existing verification suites / missing cases: Sidebar/TitleBar/hover tests; drawer/rail tests; new Chat-overlay/drawer distinction.
- Confidence: Medium for integration design; High for exact hunk/path evidence. Not checked: compilation, tests or runtime; largest full-contract audits remain below.

| Exact path | Verified marker lines in scratch merged blob | Side-diff evidence |
|---|---|---|
| `src/app/shell/MenuBar.tsx` | 9 | local 28 / upstream 222 lines; full text in conflict-evidence.json keyed by path |
| `src/app/shell/ProjectRail.tsx` | 84 | local 42 / upstream 987 lines; full text in conflict-evidence.json keyed by path |
| `src/app/shell/Sidebar.tsx` | 32, 177, 282, 788, 2304 | local 225 / upstream 772 lines; full text in conflict-evidence.json keyed by path |

## C-08 — Usage presentation
- Local: optional percentage-left setting and locale-safe metrics.
- Upstream: per-account readiness, Pi usage and remaining-percent default.
- Trace: U-010, U-011, U-019, U-027; additional local seam documented in side diff.
- Class: new product question; 4 hunks; M.
- Taking local whole loses: per-account readiness, Pi usage and remaining-percent default.
- Taking upstream whole loses: optional percentage-left setting and locale-safe metrics.
- Recommended (Inferred): Union React hooks/types and presentation prop; avoid computing remaining twice. D-06 determines whether local toggle remains meaningful or upstream remaining default replaces it. Preserve quota clamp/round tests and exhaustedWindowResetAt tests in separate describes.
- Existing verification suites / missing cases: rateLimits.test.ts; UsageFooter/UsageProviderChip tests; old-setting compatibility case.
- Confidence: Medium for integration design; High for exact hunk/path evidence. Not checked: compilation, tests or runtime; largest full-contract audits remain below.

| Exact path | Verified marker lines in scratch merged blob | Side-diff evidence |
|---|---|---|
| `src/app/shell/UsageFooter.tsx` | 2 | local 39 / upstream 343 lines; full text in conflict-evidence.json keyed by path |
| `src/app/shell/UsageProviderChip.tsx` | 76 | local 26 / upstream 339 lines; full text in conflict-evidence.json keyed by path |
| `src/features/providers/model/rateLimits.test.ts` | 4, 98 | local 89 / upstream 193 lines; full text in conflict-evidence.json keyed by path |

## C-09 — CRLF editor lifecycle
- Local: EditorDiskSession preserves disk and index EOL separately, logical-dirty check.
- Upstream: normalize/detect/restore functions, staged-only lookup via gitDiffFiles, format-on-save/autosave.
- Trace: U-003, U-023, U-028, U-056; additional local seam documented in side diff.
- Class: weave; 7 hunks; M.
- Taking local whole loses: normalize/detect/restore functions, staged-only lookup via gitDiffFiles, format-on-save/autosave.
- Taking upstream whole loses: EditorDiskSession preserves disk and index EOL separately, logical-dirty check.
- Recommended (Inferred): Keep EditorDiskSession as serializer; adopt gitDiffFiles staged/unstaged decision so true unstaged changes are not hidden by logical equality. Upstream normalization helpers must use the existing shared LineEnding type (R-03). Preserve diskSessionRef serializeForSave/serializeForStage and both test families; add autosave/format/CRLF/disk-conflict matrix.
- Existing verification suites / missing cases: editorDoc.test.ts; editorGit.test.ts; FileEditor.test.ts; lineEndings.test.ts.
- Confidence: Medium for integration design; High for exact hunk/path evidence. Not checked: compilation, tests or runtime; largest full-contract audits remain below.

| Exact path | Verified marker lines in scratch merged blob | Side-diff evidence |
|---|---|---|
| `src/features/files/editor/editorDoc.test.ts` | 3, 68 | local 80 / upstream 48 lines; full text in conflict-evidence.json keyed by path |
| `src/features/files/ui/FileEditor.tsx` | 168, 238, 273, 366, 405 | local 70 / upstream 361 lines; full text in conflict-evidence.json keyed by path |

## C-10 — File pane loading and filesystem bridge
- Local: GitFileDiffView plus local wallpaper bridge tests.
- Upstream: lazy surfaces/remote paths and pickFolders.
- Trace: U-005, U-016, U-023, U-083; L-09.
- Class: weave; 2 hunks; S.
- Taking local whole loses: lazy surfaces/remote paths and pickFolders.
- Taking upstream whole loses: GitFileDiffView plus local wallpaper bridge tests.
- Recommended (Inferred): Use upstream lazySurface/Suspense structure for shared viewers while retaining GitFileDiffView route for local diff tabs; preserve terminal branch. Union pickFolders and wallpaper test imports without replacing mocks or deleting assertions.
- Existing verification suites / missing cases: FilePane/WorkingTreeDiff tests; fs.test.ts; remote pane tests.
- Confidence: Medium for integration design; High for exact hunk/path evidence. Not checked: compilation, tests or runtime; largest full-contract audits remain below.

| Exact path | Verified marker lines in scratch merged blob | Side-diff evidence |
|---|---|---|
| `src/features/files/ui/FilePane.tsx` | 37 | local 79 / upstream 75 lines; full text in conflict-evidence.json keyed by path |
| `src/platform/tauri/fs.test.ts` | 10 | local 121 / upstream 40 lines; full text in conflict-evidence.json keyed by path |

## C-11 — Pull review and CI repair
- Local: CodeRabbit Pull review callbacks and hover continuity.
- Upstream: GitHub job/check repair session callbacks and status marks.
- Trace: U-006, U-054; additional local seam documented in side diff.
- Class: weave; 8 hunks; S.
- Taking local whole loses: GitHub job/check repair session callbacks and status marks.
- Taking upstream whole loses: CodeRabbit Pull review callbacks and hover continuity.
- Recommended (Inferred): Carry onPullReview and repairSessions/onRepairChecks through every parent/detail component signature and JSX call; keep both InboxView and inboxStatusMark test imports. Preserve distinct review report vs CI prompt fields.
- Existing verification suites / missing cases: InboxView.test.ts; githubTasks.test.ts; ciRepair tests; new both-actions rendered case.
- Confidence: Medium for integration design; High for exact hunk/path evidence. Not checked: compilation, tests or runtime; largest full-contract audits remain below.

| Exact path | Verified marker lines in scratch merged blob | Side-diff evidence |
|---|---|---|
| `src/features/inbox/ui/InboxView.tsx` | 375, 400, 1402, 1418, 1445, 2004, 2022 | local 180 / upstream 178 lines; full text in conflict-evidence.json keyed by path |
| `src/features/inbox/ui/InboxView.test.ts` | 14 | local 189 / upstream 73 lines; full text in conflict-evidence.json keyed by path |

## C-12 — Notes restore and refresh
- Local: remembered note selection, loading/error and hover system.
- Upstream: selection restore-aware initialization; Operator notes-write refresh and markdown.
- Trace: U-009, U-096, U-102; additional local seam documented in side diff.
- Class: weave; 1 hunks; S.
- Taking local whole loses: selection restore-aware initialization; Operator notes-write refresh and markdown.
- Taking upstream whole loses: remembered note selection, loading/error and hover system.
- Recommended (Inferred): Adopt upstream initializer that validates remembered selection against current notes, keep local loading/error and hover attributes; preserve notes-changed subscription.
- Existing verification suites / missing cases: notes.test.ts; NotesView.hover.test.ts; note-write tests.
- Confidence: Medium for integration design; High for exact hunk/path evidence. Not checked: compilation, tests or runtime; largest full-contract audits remain below.

| Exact path | Verified marker lines in scratch merged blob | Side-diff evidence |
|---|---|---|
| `src/features/notes/ui/NotesView.tsx` | 124 | local 265 / upstream 40 lines; full text in conflict-evidence.json keyed by path |

## C-13 — Conversation persistence
- Local: branch origin/fork fields, token usage, review reports, durable queue fields and Cline.
- Upstream: BTW/generated images/CI evidence/Operator/intent/background tasks and remote non-local save rule.
- Trace: U-004, U-006, U-007, U-008, U-009, U-011, U-020, U-022, U-023, U-036, U-040, U-050, U-064, U-089, U-093, U-101; L-04, L-20, L-23, L-25.
- Class: weave; 10 hunks; L.
- Taking local whole loses: BTW/generated images/CI evidence/Operator/intent/background tasks and remote non-local save rule.
- Taking upstream whole loses: branch origin/fork fields, token usage, review reports, durable queue fields and Cline.
- Recommended (Inferred): Union optional fields and sanitizers; preserve sanitizeBranchOrigin and review alongside sanitizeNestedId/generated image/BTW routines. Keep providerForkPoint on users; retain ciContext and intent/monocode separately. Remote host-owned sessions stay out of local persistence; local queues remain persisted (correct misleading upstream in-memory comment). Never weaken identity validation.
- Existing verification suites / missing cases: sessionStore native-branch/queue tests plus BTW/generated-image/remote tests; SQL queue tests.
- Confidence: Medium for integration design; High for exact hunk/path evidence. Not checked: compilation, tests or runtime; largest full-contract audits remain below.

| Exact path | Verified marker lines in scratch merged blob | Side-diff evidence |
|---|---|---|
| `src/features/sessions/data/sessionStore.ts` | 24, 685, 766, 790 | local 367 / upstream 448 lines; full text in conflict-evidence.json keyed by path |
| `src/features/sessions/data/sessionStore.test.ts` | 3, 26 | local 191 / upstream 364 lines; full text in conflict-evidence.json keyed by path |
| `src/features/sessions/model/session.ts` | 1, 23, 372, 467 | local 166 / upstream 230 lines; full text in conflict-evidence.json keyed by path |

## C-14 — Durable queue and usage limits
- Local: held/steering/failed-turn and editing barriers.
- Upstream: usageLimit blocks auto dispatch.
- Trace: U-011; L-06.
- Class: weave; 2 hunks; S.
- Taking local whole loses: usageLimit blocks auto dispatch.
- Taking upstream whole loses: held/steering/failed-turn and editing barriers.
- Recommended (Inferred): Single canDispatchQueuedHead checks busy, usageLimit, paused/resuming/steering/held, preparing handoff and edited head. Preserve both held-failure and usage-limit tests; resume-at-reset must not release independent local held/paused reasons.
- Existing verification suites / missing cases: messageQueue/queueDurability/usageLimit tests; new held+reset and restart cases.
- Confidence: Medium for integration design; High for exact hunk/path evidence. Not checked: compilation, tests or runtime; largest full-contract audits remain below.

| Exact path | Verified marker lines in scratch merged blob | Side-diff evidence |
|---|---|---|
| `src/features/sessions/model/messageQueue.ts` | 38 | local 225 / upstream 14 lines; full text in conflict-evidence.json keyed by path |
| `src/features/sessions/model/messageQueue.test.ts` | 64 | local 612 / upstream 13 lines; full text in conflict-evidence.json keyed by path |

## C-15 — Answer actions and side conversations
- Local: Sidechat/Branch/review-fix, session-scope approvals, forms and context meter.
- Upstream: BTW sheet callbacks, remote session view, background tools/CI/image/animations.
- Trace: U-002, U-005, U-006, U-008, U-009, U-011, U-020, U-022, U-023, U-030, U-036, U-039, U-050, U-059, U-064, U-080, U-081, U-082, U-083, U-089, U-100; L-20, L-23, L-25, L-26.
- Class: new product question; 7 hunks; L.
- Taking local whole loses: BTW sheet callbacks, remote session view, background tools/CI/image/animations.
- Taking upstream whole loses: Sidechat/Branch/review-fix, session-scope approvals, forms and context meter.
- Recommended (Inferred): Keep scope-aware onApproval and McpFormReply through every layer, branch divider tests and all five BTW callbacks if D-01 accepts BTW. D-01 chooses which user-facing Sidechat/BTW actions coexist. Add backgroundTasks to scope-aware transcript props rather than reverting approval signature. Remote session rendering has explicit unsupported feature policy (D-03).
- Existing verification suites / missing cases: AgentTranscript/branchFlow/McpForm/ApprovalToasts tests; BTW/RemoteSession tests.
- Confidence: Medium for integration design; High for exact hunk/path evidence. Not checked: compilation, tests or runtime; largest full-contract audits remain below.

| Exact path | Verified marker lines in scratch merged blob | Side-diff evidence |
|---|---|---|
| `src/features/sessions/ui/AgentTranscript.tsx` | 178, 1182 | local 303 / upstream 719 lines; full text in conflict-evidence.json keyed by path |
| `src/features/sessions/ui/AgentTranscript.test.ts` | 49 | local 102 / upstream 208 lines; full text in conflict-evidence.json keyed by path |
| `src/features/sessions/ui/SessionPane.tsx` | 102, 328 | local 125 / upstream 275 lines; full text in conflict-evidence.json keyed by path |
| `src/features/workspace/ui/PaneTree.tsx` | 20, 542 | local 59 / upstream 88 lines; full text in conflict-evidence.json keyed by path |

## C-16 — Composer routing
- Local: Queue/Steer buttons keep Stop, keyboard action resolver, form/question precedence.
- Upstream: BTW/MCP/mode commands, awaited paste, remote plan gating, allowBusySubmit replacing Stop.
- Trace: U-004, U-008, U-009, U-011, U-017, U-023, U-030, U-032, U-043, U-083; L-01, L-23, L-24.
- Class: standing call; 13 hunks; L.
- Taking local whole loses: BTW/MCP/mode commands, awaited paste, remote plan gating, allowBusySubmit replacing Stop.
- Taking upstream whole loses: Queue/Steer buttons keep Stop, keyboard action resolver, form/question precedence.
- Recommended (Inferred): Standing call NOTES §0.1 and archive 2026-09-23: retain canSteer/actionTooltip/actionAriaLabel/handleActionClick/executeComposerAction and dual Stop+send. Parse MCP/mode/BTW before selected local send/queue/steer dispatch, carry text/attachments/intents exactly once. Keep form priority and deterministic FileReader mock. Do not adopt allowBusySubmit stop-replacement branch.
- Existing verification suites / missing cases: Composer.test.ts Stop contract; composerAction tests; MCP forms/command/attachment and BTW tests.
- Confidence: Medium for integration design; High for exact hunk/path evidence. Not checked: compilation, tests or runtime; largest full-contract audits remain below.

| Exact path | Verified marker lines in scratch merged blob | Side-diff evidence |
|---|---|---|
| `src/features/sessions/ui/Composer.tsx` | 259, 607, 1579, 1766, 1849, 2642, 2906, 3047, 3060, 3084 | local 489 / upstream 1325 lines; full text in conflict-evidence.json keyed by path |
| `src/features/sessions/ui/Composer.test.ts` | 60, 155, 201 | local 91 / upstream 1095 lines; full text in conflict-evidence.json keyed by path |

## C-17 — Appearance and settings
- Local: Windows wallpaper/glass/fonts/hover/frame opacity; AI helper settings; discovery loading/retry/update toasts.
- Upstream: Haze, Linux glass, provider scopes/binary UI, format-on-save/keybindings/MCP/scale menu.
- Trace: U-001, U-002, U-003, U-004, U-007, U-008, U-009, U-010, U-012, U-013, U-022, U-023, U-028, U-030, U-031, U-032, U-043, U-052, U-057, U-086, U-090, U-092; L-09, L-19.
- Class: weave; 23 hunks; L.
- Taking local whole loses: Haze, Linux glass, provider scopes/binary UI, format-on-save/keybindings/MCP/scale menu.
- Taking upstream whole loses: Windows wallpaper/glass/fonts/hover/frame opacity; AI helper settings; discovery loading/retry/update toasts.
- Recommended (Inferred): Union platform/color/storage imports. Keep all local initial appearance applications and stable Popover wash; carry upstream Linux/native theme options. Render AI helper and Editor groups separately. Compose provider scope controls with initialLoading/Recheck; D-02 selects updater UI, D-04 override store. Segmented options support disabled/title/description plus icon. Haze remains chat-only unless D-08 approves wallpaper support.
- Existing verification suites / missing cases: appearance/settings/wallpaper/hover/provider loading tests; scale/menu/MCP tests; Windows manual follow-up.
- Confidence: Medium for integration design; High for exact hunk/path evidence. Not checked: compilation, tests or runtime; largest full-contract audits remain below.

| Exact path | Verified marker lines in scratch merged blob | Side-diff evidence |
|---|---|---|
| `src/features/settings/model/appearance.ts` | 2, 1165 | local 946 / upstream 110 lines; full text in conflict-evidence.json keyed by path |
| `src/features/settings/model/settings.test.ts` | 4, 24, 40, 51, 66 | local 346 / upstream 301 lines; full text in conflict-evidence.json keyed by path |
| `src/features/settings/ui/SettingsView.tsx` | 251, 372, 391, 413, 1292, 3573, 3933, 4143, 4551, 4567, 4587, 4612, 5431, 5614 | local 1612 / upstream 1296 lines; full text in conflict-evidence.json keyed by path |
| `src/styles/index.css` | 307, 460 | local 317 / upstream 1264 lines; full text in conflict-evidence.json keyed by path |

## C-18 — Changes review scope and line diff
- Local: line-ending normalization and flexible staged/unstaged focus options.
- Upstream: explicit section kind and line-based big-file diff.
- Trace: U-098, U-099; additional local seam documented in side diff.
- Class: weave; 3 hunks; S.
- Taking local whole loses: explicit section kind and line-based big-file diff.
- Taking upstream whole loses: line-ending normalization and flexible staged/unstaged focus options.
- Recommended (Inferred): Union decodeLineEndings and LINE_DIFF_CONFIG imports; preserve normalizing input and use upstream line diff config. Thread staged/unstaged kind through Open All Changes; preserve focusPath without making section refresh lose selected file. Update direct consumers together.
- Existing verification suites / missing cases: unifiedDiff/gitText/WorkingTreeDiff tests; new selected-path+section switching case.
- Confidence: Medium for integration design; High for exact hunk/path evidence. Not checked: compilation, tests or runtime; largest full-contract audits remain below.

| Exact path | Verified marker lines in scratch merged blob | Side-diff evidence |
|---|---|---|
| `src/features/source-control/model/unifiedDiff.ts` | 3 | local 13 / upstream 15 lines; full text in conflict-evidence.json keyed by path |
| `src/features/source-control/ui/SourceControl.tsx` | 12 | local 16 / upstream 9 lines; full text in conflict-evidence.json keyed by path |
| `src/features/source-control/ui/WorkingTreeDiff.tsx` | 155 | local 18 / upstream 42 lines; full text in conflict-evidence.json keyed by path |

## C-19 — Commit/PR helper and cancellation
- Local: selected helper model, structured PR draft dialog and no overwrite of human edits.
- Upstream: abort controller/repeat-submit guards, remote PR content and cancel control.
- Trace: U-005, U-007, U-023, U-025, U-098; L-19.
- Class: new product question; 20 hunks; L.
- Taking local whole loses: abort controller/repeat-submit guards, remote PR content and cancel control.
- Taking upstream whole loses: selected helper model, structured PR draft dialog and no overwrite of human edits.
- Recommended (Inferred): D-07 parameter: keep generateHelperCommitMessage/generateHelperPrContent for local calls with AbortSignal; adopt cancel UI and duplicate-generation guard, preserve startText comparison and helperFailureMessage. Remote content uses remote API; do not send remote cwd to local helper. Keep both add/add test suites after reconciling mocks once.
- Existing verification suites / missing cases: helperPipeline/PrDetailsDialog/GitChangesPanel/SwitchBranchDialog tests; add cancel+edited-field combination.
- Confidence: Medium for integration design; High for exact hunk/path evidence. Not checked: compilation, tests or runtime; largest full-contract audits remain below.

| Exact path | Verified marker lines in scratch merged blob | Side-diff evidence |
|---|---|---|
| `src/features/source-control/ui/GitChangesPanel.tsx` | 74, 125, 380, 397, 589, 609, 719, 975, 1023, 1390, 1602, 1640 | local 303 / upstream 256 lines; full text in conflict-evidence.json keyed by path |
| `src/features/source-control/ui/GitChangesPanel.test.ts` | 6, 64, 116 | local 262 / upstream 168 lines; full text in conflict-evidence.json keyed by path |
| `src/features/source-control/ui/SwitchBranchDialog.tsx` | 83, 103, 120 | local 65 / upstream 121 lines; full text in conflict-evidence.json keyed by path |
| `src/features/source-control/ui/SwitchBranchDialog.test.ts` | 3, 127 | local 148 / upstream 81 lines; full text in conflict-evidence.json keyed by path |

## C-20 — Workspace serialization and preview scope
- Local: diff/focusKind metadata and Windows encoded-drive repairs.
- Upstream: preview tabs, remote-file discriminants, saved-model fallback and staged section kind.
- Trace: U-005, U-023, U-038, U-044, U-098; additional local seam documented in side diff.
- Class: weave; 6 hunks; M.
- Taking local whole loses: preview tabs, remote-file discriminants, saved-model fallback and staged section kind.
- Taking upstream whole loses: diff/focusKind metadata and Windows encoded-drive repairs.
- Recommended (Inferred): Union import lists; keep !file.diff in reusable editor predicate if local special diff viewer is retained. Validate diff/focusKind and remoteFile independently; remoteOwner maps remote paths, else apply repairLegacyEncodedDriveColon. model=stub.model||session.model avoids blank legacy models without catalog normalization.
- Existing verification suites / missing cases: workspaceSnapshot/layout/terminalPanes tests; old Windows snapshot + preview/remote tests.
- Confidence: Medium for integration design; High for exact hunk/path evidence. Not checked: compilation, tests or runtime; largest full-contract audits remain below.

| Exact path | Verified marker lines in scratch merged blob | Side-diff evidence |
|---|---|---|
| `src/features/workspace/model/layout.ts` | 467, 726 | local 77 / upstream 234 lines; full text in conflict-evidence.json keyed by path |
| `src/features/workspace/model/workspaceSnapshot.ts` | 380, 571, 656 | local 187 / upstream 214 lines; full text in conflict-evidence.json keyed by path |
| `src/features/workspace/model/workspaceSnapshot.test.ts` | 16 | local 195 / upstream 185 lines; full text in conflict-evidence.json keyed by path |

## C-21 — Telemetry reducer
- Local: stampTurnUsage/liveTurnUsage ownership and findTurnOwnerIndex.
- Upstream: endedAt parameter/background-task clearing/intent/todo/image events.
- Trace: U-006, U-009, U-011, U-020, U-022, U-023, U-036, U-037, U-050, U-083, U-089, U-093; L-20, L-23, L-24, L-25.
- Class: weave; 3 hunks; S.
- Taking local whole loses: endedAt parameter/background-task clearing/intent/todo/image events.
- Taking upstream whole loses: stampTurnUsage/liveTurnUsage ownership and findTurnOwnerIndex.
- Recommended (Inferred): stopStreaming(session,endedAt=Date.now()) clears backgroundTasks and stamps local token usage before duration using active turn owner; keep findTurnOwnerIndex separate from stampTurnDuration(blocks,endedAt). Do not stamp most-recent internal synthetic user as owner.
- Existing verification suites / missing cases: tokenAccounting/tokenUsageLifecycle/apply tests; background/plan completion tests.
- Confidence: Medium for integration design; High for exact hunk/path evidence. Not checked: compilation, tests or runtime; largest full-contract audits remain below.

| Exact path | Verified marker lines in scratch merged blob | Side-diff evidence |
|---|---|---|
| `src/integrations/harness/core/apply.ts` | 548, 565, 739 | local 180 / upstream 219 lines; full text in conflict-evidence.json keyed by path |

## C-22 — Harness interface union
- Local: runHelperPrompt/inspectContext/native fork/form/session approval APIs.
- Upstream: runTextPrompt/stopTextPrompt/task-list restore/batched flush and cancellation.
- Trace: U-008, U-009, U-025, U-029, U-083, U-093; L-19, L-20, L-23, L-24, L-25.
- Class: weave; 7 hunks; L.
- Taking local whole loses: runTextPrompt/stopTextPrompt/task-list restore/batched flush and cancellation.
- Taking upstream whole loses: runHelperPrompt/inspectContext/native fork/form/session approval APIs.
- Recommended (Inferred): Keep HelperPromptInput/runHelperPrompt and TextPromptInput/runTextPrompt as distinct contracts; union adapter fields/exports and isolated cancellation. Do not route helper callers into general read-only tool-capable BTW by default (D-07). Extend tests to Cline explicit support/unsupported behavior rather than dropping its provider key.
- Existing verification suites / missing cases: registry/helperPipeline/native context tests; isolated text/BWT tests.
- Confidence: Medium for integration design; High for exact hunk/path evidence. Not checked: compilation, tests or runtime; largest full-contract audits remain below.

| Exact path | Verified marker lines in scratch merged blob | Side-diff evidence |
|---|---|---|
| `src/integrations/harness/core/registry.ts` | 1, 37, 127, 439, 511 | local 104 / upstream 189 lines; full text in conflict-evidence.json keyed by path |
| `src/integrations/harness/core/registry.test.ts` | 67 | local 55 / upstream 183 lines; full text in conflict-evidence.json keyed by path |
| `src/integrations/harness/index.ts` | 194 | local 41 / upstream 42 lines; full text in conflict-evidence.json keyed by path |

## C-23 — Removed upstream Antigravity provider
- Local: official shared ACP implementation moved to core; old provider tree intentionally removed.
- Upstream: old provider binary-override/remote access/clipboard test edits.
- Trace: U-013, U-017, U-023; additional local seam documented in side diff.
- Class: standing call; 0 hunks; S.
- Taking local whole loses: old provider binary-override/remote access/clipboard test edits.
- Taking upstream whole loses: official shared ACP implementation moved to core; old provider tree intentionally removed.
- Recommended (Inferred): NOTES §0.3 / archive 2026-09-23 round2.1: retain deletion of these paths. Port relevant configurable-binary/clipboard tests into core ACP tests after verifying native contract. Repair host/providers import before remote host builds; do not resurrect AntigravityBinary/antigravity_args or duplicate command.
- Existing verification suites / missing cases: antigravityAcpLive/protocol/catalog/availability/helper tests; new host ACP integration missing.
- Confidence: Medium for integration design; High for exact hunk/path evidence. Not checked: compilation, tests or runtime; largest full-contract audits remain below.

| Exact path | Verified marker lines in scratch merged blob | Side-diff evidence |
|---|---|---|
| `src/integrations/harness/providers/antigravity/antigravity.ts` | modify/delete stage entries; no markers | local 834 / upstream 16 lines; full text in conflict-evidence.json keyed by path |
| `src/integrations/harness/providers/antigravity/antigravityCatalog.ts` | modify/delete stage entries; no markers | local 84 / upstream 63 lines; full text in conflict-evidence.json keyed by path |
| `src/integrations/harness/providers/antigravity/antigravityLive.test.ts` | modify/delete stage entries; no markers | local 851 / upstream 34 lines; full text in conflict-evidence.json keyed by path |
| `src/integrations/harness/providers/antigravity/antigravityProtocol.test.ts` | modify/delete stage entries; no markers | local 120 / upstream 23 lines; full text in conflict-evidence.json keyed by path |

## C-24 — Claude live provider union
- Local: session grants/live controls/native forks/context usage/human-origin helper isolation.
- Upstream: streamed input/boundaries/background task lifecycle/task-list restores and text prompts.
- Trace: U-008, U-009, U-011, U-013, U-034, U-036, U-037, U-062, U-069, U-087, U-089, U-093; L-03, L-19, L-20, L-21, L-22, L-24, L-25, L-28.
- Class: weave; 9 hunks; L.
- Taking local whole loses: streamed input/boundaries/background task lifecycle/task-list restores and text prompts.
- Taking upstream whole loses: session grants/live controls/native forks/context usage/human-origin helper isolation.
- Recommended (Inferred): Union Live fields, task/grant maps and resets; keep delayed providerBound with reported fork ID. Preserve live model/permission controls and grant liveness checks; add pendingAssistantBoundary and background/task logic. Keep runHelperPrompt plus runTextPrompt/stopTextPrompt adapter methods. Union tests, not one test file per side.
- Existing verification suites / missing cases: ClaudeLive/Control/Protocol/Text and branch tests; combined fork/live-control/background tests.
- Confidence: Medium for integration design; High for exact hunk/path evidence. Not checked: compilation, tests or runtime; largest full-contract audits remain below.

| Exact path | Verified marker lines in scratch merged blob | Side-diff evidence |
|---|---|---|
| `src/integrations/harness/providers/claude/claude.ts` | 211, 229, 465, 671, 2324 | local 778 / upstream 560 lines; full text in conflict-evidence.json keyed by path |
| `src/integrations/harness/providers/claude/claudeAdapter.ts` | 21, 52 | local 22 / upstream 26 lines; full text in conflict-evidence.json keyed by path |
| `src/integrations/harness/providers/claude/claudeLive.test.ts` | 39 | local 721 / upstream 1220 lines; full text in conflict-evidence.json keyed by path |
| `src/integrations/harness/providers/claude/claudeProtocol.test.ts` | 1234 | local 385 / upstream 161 lines; full text in conflict-evidence.json keyed by path |

## C-25 — Codex live provider union
- Local: native fork, cumulative token baselines, MCP typed forms and guarded session grants.
- Upstream: per-item text maps, image notifications, usage limits/Operator network state and all Full Access confirmations.
- Trace: U-008, U-009, U-011, U-013, U-017, U-020, U-035, U-037, U-040, U-089, U-101; L-19, L-20, L-21, L-23, L-24, L-25.
- Class: weave; 13 hunks; L.
- Taking local whole loses: per-item text maps, image notifications, usage limits/Operator network state and all Full Access confirmations.
- Taking upstream whole loses: native fork, cumulative token baselines, MCP typed forms and guarded session grants.
- Recommended (Inferred): Use emittedAssistantByItem/emittedReasoningByItem but retain threadBaseline/lastThreadTotal/turnUsage and inProgressMcpTools resets. In elicitation handler call codexMcpConfirmation with parent candidates; broaden only non-plan Full Access confirmation acceptance, then non-plan stored grant path, then explicit confirmation/form UI. Remove stale isCodexComputerUseAccessConfirmation import/call. Retain session grant liveness and form validation. Union protocol tokenUsage with usageLimited/rateLimits fields.
- Existing verification suites / missing cases: codexLive/Elicitation/Protocol/ApprovalUi, MCP forms and token accounting tests; new confirmation+grant+plan matrix.
- Confidence: Medium for integration design; High for exact hunk/path evidence. Not checked: compilation, tests or runtime; largest full-contract audits remain below.

| Exact path | Verified marker lines in scratch merged blob | Side-diff evidence |
|---|---|---|
| `src/integrations/harness/providers/codex/codex.ts` | 49, 137, 510, 783, 1040, 1287, 1390, 1492 | local 605 / upstream 403 lines; full text in conflict-evidence.json keyed by path |
| `src/integrations/harness/providers/codex/codexAdapter.ts` | 22, 59 | local 36 / upstream 29 lines; full text in conflict-evidence.json keyed by path |
| `src/integrations/harness/providers/codex/codexElicitation.test.ts` | 1 | local 386 / upstream 33 lines; full text in conflict-evidence.json keyed by path |
| `src/integrations/harness/providers/codex/codexLive.test.ts` | 139 | local 890 / upstream 478 lines; full text in conflict-evidence.json keyed by path |
| `src/integrations/harness/providers/codex/codexProtocol.ts` | 376 | local 169 / upstream 225 lines; full text in conflict-evidence.json keyed by path |

## C-26 — Isolated helper versus read-only text runners
- Local: tools denied and HelperToolAttemptError aborts helper; structured output/model preference.
- Upstream: read-only BTW tools/events/thread/settings/cancellation and configured runtime binaries.
- Trace: U-008, U-013, U-025; L-19.
- Class: new product question; 37 hunks; L.
- Taking local whole loses: read-only BTW tools/events/thread/settings/cancellation and configured runtime binaries.
- Taking upstream whole loses: tools denied and HelperToolAttemptError aborts helper; structured output/model preference.
- Recommended (Inferred): D-07 must keep isolated helper semantics. Add explicit helper isolation mode or retain a dedicated helper runner; noTools/max-turn/deny-all and outputSchema persist only for helper calls, upstream read-only BTW stays separate. Include isolation in reuse key so a tool-enabled runtime cannot serve helper calls. Carry AbortSignal cleanup and thread resume/settings logic without broadening helper permissions.
- Existing verification suites / missing cases: helperPipeline/ClaudeText/CodexText/OpenCodeText tests; new alternating helper/BTW account/model/isolation case.
- Confidence: Medium for integration design; High for exact hunk/path evidence. Not checked: compilation, tests or runtime; largest full-contract audits remain below.

| Exact path | Verified marker lines in scratch merged blob | Side-diff evidence |
|---|---|---|
| `src/integrations/harness/providers/claude/claudeText.ts` | 17, 29, 72, 147, 169, 179, 203, 254, 272, 286, 296, 307, 317, 352, 444 | local 132 / upstream 296 lines; full text in conflict-evidence.json keyed by path |
| `src/integrations/harness/providers/codex/codexText.ts` | 44, 115, 143, 156, 171, 203, 235, 248, 285, 312, 332, 423, 506 | local 162 / upstream 327 lines; full text in conflict-evidence.json keyed by path |
| `src/integrations/harness/providers/opencode/opencodeText.ts` | 28, 79, 100, 110, 173 | local 58 / upstream 333 lines; full text in conflict-evidence.json keyed by path |
| `src/integrations/harness/providers/opencode/opencodeText.test.ts` | 1, 166 | local 107 / upstream 231 lines; full text in conflict-evidence.json keyed by path |
| `src/integrations/harness/providers/opencode/opencodeAdapter.ts` | 20, 50 | local 14 / upstream 18 lines; full text in conflict-evidence.json keyed by path |

## C-27 — Windows PTY event offsets
- Local: offset-aware replay and bytesSeen buffering.
- Upstream: decodePtyChunk skips malformed base64.
- Trace: U-061; additional local seam documented in side diff.
- Class: weave; 2 hunks; S.
- Taking local whole loses: decodePtyChunk skips malformed base64.
- Taking upstream whole loses: offset-aware replay and bytesSeen buffering.
- Recommended (Inferred): decodePtyChunk first; on null do not change bytesSeen or invoke handler. On valid chunk preserve start offset, update bytesSeen and pass offset to handler/pushBuffered. Union decode tests with replay/unsupported notification tests.
- Existing verification suites / missing cases: pty.test.ts; terminalSurfaceParity/TerminalView tests.
- Confidence: Medium for integration design; High for exact hunk/path evidence. Not checked: compilation, tests or runtime; largest full-contract audits remain below.

| Exact path | Verified marker lines in scratch merged blob | Side-diff evidence |
|---|---|---|
| `src/platform/tauri/pty.ts` | 135 | local 119 / upstream 26 lines; full text in conflict-evidence.json keyed by path |
| `src/platform/tauri/pty.test.ts` | 2 | local 39 / upstream 26 lines; full text in conflict-evidence.json keyed by path |

## Risks without a textual conflict

| ID | What breaks / when | Evidence | Proposed handling | Confidence |
|---|---|---|---|
| R-01 New availability store omits Cline (U-004; L-04,L-18) | typecheck; runtime split-store discovery | Verified `availabilityState.ts:8–20 @ 43aac9d` declares Record<HarnessId,boolean> with ten members; local session.ts:30 includes Cline. Local availability.ts retains its own evidenced state. | Add Cline and consolidate one store with local evidence/error semantics; preserve lazy ACP. | High (source; runtime Not checked) |
| R-02 Remote host imports the intentionally removed Antigravity provider (U-023; L-03) | host typecheck/build after standing deletion; runtime | Verified `host/providers.ts:10,142 @ 43aac9d` imports/calls old module; C-23 requires deletion. | Port host adapter to core ACP with a verified Node-compatible transport, or explicitly disable remote ACP until that work is approved. Do not restore deleted provider. | High (source; runtime Not checked) |
| R-03 Clean editorDoc merge has duplicate LineEnding binding (U-056; L-27) | typecheck | Verified scratch merged editorDoc.ts:7 imports LineEnding and :22 exports a separate LineEnding declaration. No Git conflict. | Use/re-export one shared sessions/model/lineEndings type; adapt upstream normalizers to existing encode/decode contract and retain disk/index serializers. | High (source; runtime Not checked) |
| R-04 Two persisted CLI override stores do not migrate automatically (U-013; L-03,L-04,L-13,L-18) | runtime with existing settings | Verified local customBinary.ts:3 uses monocode.customBinary.<id>; new providerBinaryPaths.ts:6 uses monocode.providerBinaryPaths.v1. | D-04 chooses one store and explicit legacy migration/precedence; keep existing ACP/Cline overrides valid and backend authorization. | High (source; runtime Not checked) |
| R-05 Clean removal of Codex computer-use helper breaks whole-file local Codex selection (U-040; L-20,L-21,L-23) | typecheck after an ours-only resolution | Verified upstream codexElicitation.ts deletes exported isCodexComputerUseAccessConfirmation; local Codex uses it. B merge keeps grants/forms but deletes helper. | C-25 removes import/call and uses broader non-plan Full Access only for recognized confirmations; no form auto-fill. | High (source; runtime Not checked) |
| R-06 New update notice blanket probes ACP and duplicates local notifications (U-029; L-03,L-18) | runtime startup/processes and double notices | Verified src/features/providers/ui/HarnessUpdateNotice.tsx:49 calls probeHarnessAvailability() before filtering updatable harnesses; local availability uses lazy exclude options, local ProvidersPage owns UpdateToasts. | D-02 chooses one notice flow; exclude ACP from blanket startup probes; keep explicit discovery and honest unknown states. | High (source; runtime Not checked) |
| R-07 Haze shares the effect union but wallpaper uses worker rendering (U-002; L-09) | runtime when selecting Haze for wallpaper | Verified Haze gradient-blur bypasses applyPreparedNewThreadBackground worker conversion; local applyWallpaperPath calls renderWallpaper/prepareNewThreadBackgroundEffect. Inferred wallpaper Haze may take unsupported worker route. | D-08: keep Haze chat-only in round1; enumerate wallpaper five effects separately until native wallpaper Haze renderer/guard is approved. | Medium (source; runtime Not checked) |
| R-08 Remote feature support excludes Cline and local forms/session scopes (U-023; L-04,L-20,L-23,L-25) | runtime UI and remote protocol | Verified REMOTE_PROVIDERS in connections/model/protocol.ts:7 has ten entries, no Cline; host approve signature accepts decision without ApprovalScope. Local UI forwards scope/forms. | D-03 choose explicit support matrix; local features preserved locally; remote hides unsupported scopes/forms rather than silently promising them. Extend protocol only with separate approval. | High (source; runtime Not checked) |
| R-09 Queue reset auto-resume can bypass independent holds (U-011; L-05,L-06) | runtime/reset timer and restored data | Verified usageLimitResumeDue/add resume loop arrives in App; local queueStatus held/steering barriers are separate. Inferred interaction requires combined tests. | Keep held/paused reason authoritative; reset clears usage hold only. Add reset+held/restart tests before enabling automatic resume. | Medium (source; runtime Not checked) |
| R-10 Generated image cleanup and native fork copies may share asset IDs (U-020; L-25) | runtime when deleting a copied branch | Verified generated-image save/delete commands and local forkThreadBlocks copy transcript metadata. Not checked cross-branch asset-reference ownership. | Audit cleanup against all saved branch references; add original/branch deletion round-trip before shipping copied image history. | Medium (source; runtime Not checked) |
| R-11 New host pipeline adds independent build/runtime requirements (U-023,U-067,U-077; L-13) | host typecheck/build; packaging/CI | Verified package scripts host:build/test:host and host/tsconfig; CI host packages/Node24, dev esbuild/@types/node. | Owner approve CI/dependencies; later worker runs host gates as well as web/Rust. Analysis performed no install/check. | High (source; runtime Not checked) |
| R-12 Native bridge/search union must preserve queue SQL and hidden process behavior (U-064,U-029,U-023; L-05,L-13) | Rust typecheck/tests; Windows runtime/old DB | Verified SQL v14 queued columns local; upstream18 remains endpoint. Conflict search converts Command to argument vector; new modules spawn subprocesses. Full new spawn-path audit Not checked. | Preserve column/placeholder/mapper alignment, Windows cwd alternatives and helper suppression. Audit every added spawn before enabling updates/remote. | Medium (source; runtime Not checked) |
| R-13 Exact test lists may encode upstream ten providers or UI text (U-008,U-027; L-04,L-12) | tests | Verified registry.test.ts source provider-support list lacks local Cline; ModelPicker.test still asserts 440/442 and quota tests differ used/left text. | Add Cline support/explicit unsupported classification to new test lists; keep old local dimensions; D-06 controls quota text. Never weaken tests to green. | High (source; runtime Not checked) |
| R-14 Old snapshots must union remote/preview discriminants with local diff metadata (U-005,U-023; L-07,L-08,L-16) | runtime restore/old data | Verified workspaceSnapshot.ts conflict compares remoteFile/remoteOwner against diff/focusKind/drive-colon repair. New fields absent in old records. | Restore absent fields with backward defaults; retain validation of local diff/focusKind and legacy drive normalization only for local paths; add persisted fixture matrix. | Medium (source; runtime Not checked) |
| R-15 New read-only text runtimes cannot replace tool-free helpers (U-008; L-19) | runtime helper isolation | Verified ClaudeText hunk switches noTools:true to settings permission/maxTurns; CodexText changes item/started tool rejection to event forwarding; OpenCodeText no longer rejects helper tool parts. | D-07 must require distinct helper isolation/reuse key; structured output and fail-closed tool attempt regressions remain. | High (source; runtime Not checked) |

## Clean-merge preservation review

Verified: all 47 B blobs were read by `scripts/clean-audit.py`; the 201-line result was reviewed. Selected local added declarations survive textually in every B file examined. This does not prove runtime wiring. R-03 demonstrates why declaration survival alone is insufficient. Full per-path structural result is in scripts/clean-merge-audit.md.

- L-14: Windows ConPTY/replay added lines survive in pty.rs; incoming Linux c_char fix is unrelated to Windows path.
- L-08: DormantTerminalView/start lifecycle survives TerminalView.tsx; App close paths still require C-06.
- L-09/L-19: wallpaper/helper storage functions and tests survive clean settings.ts; C-17 must keep UI wiring and new effects guarded.
- L-10: SharedHoverHighlight remains in Popover frame; Quick composer updates positioning/backdrop options, so desktop geometry still needs later verification.
- L-20/L-23: grants/form parsing survives codexElicitation.ts while deprecated confirmation helper is removed (R-05).
- L-22/L-24/L-25/L-28: live-control/context/branch/human-origin declarations survive ClaudeProtocol and types; live-provider callers conflict and require C-24/C-25.
- L-25: OpenCode native-fork path survives its clean provider file and tests; helper text runner is a separate conflict.
- Local docs/jira.md and docs/screenshot.jpg deletions do not conflict: upstream did not change them in this range. No renames upstream; local Antigravity adapter R072 is the only detected local source move.

## Not analysed deeply — exact paths and reason

The following gaps remain **Not checked**. Every X path has hunk-level analysis above, but full bodies of large side diffs were sampled, not exhaustively audited. These are review requirements, not permission for a worker to guess.
- `src-tauri/src/fs.rs`: full contract/control-flow audit beyond marker seams remains; source diff exceeds 1,500 combined lines.
- `src-tauri/src/harness.rs`: full contract/control-flow audit beyond marker seams remains; source diff exceeds 1,500 combined lines.
- `src-tauri/src/session_store.rs`: full contract/control-flow audit beyond marker seams remains; source diff exceeds 1,500 combined lines.
- `src/app/App.tsx`: full contract/control-flow audit beyond marker seams remains; source diff exceeds 1,500 combined lines.
- `src/features/sessions/ui/Composer.tsx`: full contract/control-flow audit beyond marker seams remains; source diff exceeds 1,500 combined lines.
- `src/features/settings/ui/SettingsView.tsx`: full contract/control-flow audit beyond marker seams remains; source diff exceeds 1,500 combined lines.
- `src/integrations/harness/providers/claude/claudeLive.test.ts`: full contract/control-flow audit beyond marker seams remains; source diff exceeds 1,500 combined lines.
- `src/styles/index.css`: full contract/control-flow audit beyond marker seams remains; source diff exceeds 1,500 combined lines.
- `host/attachments.test.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/attachments.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/bootstrap.test.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/browse.test.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/browse.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/build.mjs @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/child-backend.test.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/child-backend.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/cli.test.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/cli.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/engine.test.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/engine.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/git-branches.test.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/git-branches.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/git-worktrees.test.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/git-worktrees.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/large-sync.test.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/opencode-transport.test.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/owner.test.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/owner.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/package.mjs @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/process.test.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/process.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/provider-guard.mjs @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/provider-transport.test.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/providers.test.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/providers.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/server.test.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/server.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/service.test.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/service.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/store.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/sync-transfer.test.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/sync-transfer.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/tsconfig.json @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/vitest.config.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/windows-acl.ps1 @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/windows-bootstrap.test.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/windows.test.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/windows.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/workspace-commands.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/workspace.test.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `host/workspace.ts @ 43aac9d`: remote-host module full security/persistence/transport audit not completed; only feature declarations and known ACP import/provider matrix reviewed.
- `src-tauri/src/mcp.rs @ 43aac9d`: provider config-write compatibility with every CLI version not checked.
- `src-tauri/src/remote.rs @ 43aac9d`, `src-tauri/src/remote_ssh.rs @ 43aac9d`, `src-tauri/src/harness_updates.rs @ 43aac9d`: full security/process-spawn audit not completed.
- `src/features/settings/model/appearance.ts`: Haze wallpaper compatibility remains Inferred; round1 can safely retain original five wallpaper choices pending D-08.
