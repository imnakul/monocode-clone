# Stage 3 — Complete changed-file classification

Verified: `git diff --name-status -M 3344bea 43aac9d` and same local range; scratch `git merge-tree --write-tree c2c8bf6 <target>` (one full target, then each tag). Main checkout objects/index/working files were not used for simulations. Script: `scripts/manifest.py`.

## Counts and reconciliation

Upstream action totals: {'A': 258, 'M': 269}; **527** exact destination-path records. Renames, if present, preserve the old path in the action column.
Groups: {'N': 256, 'E': 144, 'X': 80, 'B': 47}; 256 N + 144 E + 47 B + 80 X + 0 S = **527**.
X = 80 = 80 simulation unmerged paths, with exact set equality asserted. No overlap is treated as a conflict unless simulation reports it.

| Top-level area | Paths |
|---|---:|
| .gitattributes | 1 |
| .github | 2 |
| CHANGELOG.md | 1 |
| Cargo.lock | 1 |
| Cargo.toml | 1 |
| README.md | 1 |
| docs | 1 |
| host | 43 |
| package-lock.json | 1 |
| package.json | 1 |
| quick-composer.html | 1 |
| scripts | 2 |
| src | 438 |
| src-tauri | 32 |
| vite.config.ts | 1 |

## Conflict arrival by tag

| Our pinned HEAD versus target | Unmerged paths |
|---|---:|
| v0.1.56 | 23 |
| v0.2.0 | 45 |
| v0.3.0 | 60 |
| v0.4.0 | 68 |
| v0.4.1 | 68 |
| v0.4.2 | 68 |
| v0.4.3 | 68 |
| v0.5.0 | 74 |
| v0.6.0 | 76 |
| pinned post-tag 43aac9d | 80 |

Verified these compare the **same local HEAD** independently to each tag. Inferred: they indicate where conflict load first appears. They do not measure conflicts in sequential rounds after earlier resolutions; counts cannot be summed to predict repair effort.

## Full X list

| Path | Kind | U IDs | L IDs |
|---|---|---|---|
| `Cargo.lock` | content | U-007,U-017,U-019,U-030,U-042,U-049,U-063,U-072,U-073,U-075,U-076,U-085,U-094 | L-13,L-14,L-17 |
| `Cargo.toml` | content | U-042,U-049,U-063,U-072,U-073,U-075,U-076,U-085,U-094 |  |
| `package-lock.json` | content | U-023,U-042,U-049,U-063,U-072,U-073,U-075,U-076,U-085,U-094 |  |
| `package.json` | content | U-023,U-042,U-049,U-063,U-067,U-072,U-073,U-075,U-076,U-085,U-094 |  |
| `src-tauri/src/fs.rs` | content | U-006,U-008,U-017,U-020,U-050,U-054,U-058,U-064,U-066,U-074,U-075 | L-09,L-13,L-15,L-27 |
| `src-tauri/src/harness.rs` | content | U-013,U-029,U-030,U-050,U-053 | L-03,L-04,L-13,L-17 |
| `src-tauri/src/lib.rs` | content | U-006,U-007,U-009,U-010,U-012,U-013,U-017,U-019,U-020,U-023,U-028,U-029,U-030,U-045,U-050,U-064,U-066,U-074 | L-03,L-04,L-09,L-13,L-14,L-16,L-19 |
| `src-tauri/src/main.rs` | content | U-009,U-023 | L-03 |
| `src-tauri/src/search.rs` | content | U-064 | L-13 |
| `src-tauri/src/session_store.rs` | content | U-020,U-064,U-074,U-075,U-076 | L-05 |
| `src-tauri/src/window.rs` | content | U-007,U-031 | L-13 |
| `src-tauri/tauri.conf.json` | content | U-042,U-049,U-063,U-067,U-072,U-073,U-075,U-076,U-085,U-094 | L-09,L-13 |
| `src/app/App.tsx` | content | U-004,U-005,U-006,U-007,U-008,U-009,U-011,U-012,U-015,U-016,U-018,U-019,U-020,U-022,U-023,U-028,U-029,U-030,U-036,U-038,U-046,U-055,U-062,U-083,U-093,U-096,U-097,U-098 | L-02,L-03,L-07,L-19,L-20,L-23,L-25,L-28 |
| `src/app/shell/MenuBar.tsx` | content | U-012,U-028 |  |
| `src/app/shell/ProjectRail.tsx` | content | U-001,U-023,U-073,U-074 |  |
| `src/app/shell/Sidebar.tsx` | content | U-001,U-005,U-023,U-026,U-055,U-073,U-098 | L-09 |
| `src/app/shell/UsageFooter.tsx` | content | U-010,U-019 |  |
| `src/app/shell/UsageProviderChip.tsx` | content | U-010,U-019,U-027 |  |
| `src/features/files/editor/editorDoc.test.ts` | content | U-056 |  |
| `src/features/files/ui/FileEditor.tsx` | content | U-003,U-023,U-028,U-056 |  |
| `src/features/files/ui/FilePane.tsx` | content | U-005,U-023,U-083 |  |
| `src/features/inbox/ui/InboxView.test.ts` | content | U-006,U-054 |  |
| `src/features/inbox/ui/InboxView.tsx` | content | U-006,U-054 |  |
| `src/features/notes/ui/NotesView.tsx` | content | U-009,U-096,U-102 |  |
| `src/features/providers/model/rateLimits.test.ts` | content | U-010,U-011 |  |
| `src/features/sessions/data/sessionStore.test.ts` | content | U-006,U-008,U-009,U-020,U-023,U-050,U-089,U-101 | L-20,L-23,L-25 |
| `src/features/sessions/data/sessionStore.ts` | content | U-006,U-008,U-009,U-020,U-022,U-023,U-050,U-064,U-089,U-093,U-101 | L-20,L-25 |
| `src/features/sessions/model/messageQueue.test.ts` | content | U-011 |  |
| `src/features/sessions/model/messageQueue.ts` | content | U-011 | L-06 |
| `src/features/sessions/model/session.ts` | content | U-004,U-006,U-007,U-008,U-009,U-011,U-020,U-022,U-036,U-040,U-089,U-093 | L-04,L-20,L-23,L-25 |
| `src/features/sessions/ui/AgentTranscript.test.ts` | content | U-006,U-009,U-023,U-089 | L-20,L-25 |
| `src/features/sessions/ui/AgentTranscript.tsx` | content | U-006,U-008,U-009,U-020,U-022,U-023,U-036,U-039,U-050,U-059,U-064,U-080,U-081,U-082,U-083,U-089,U-100 | L-20,L-25 |
| `src/features/sessions/ui/Composer.test.ts` | content | U-008,U-009,U-030,U-032 | L-23 |
| `src/features/sessions/ui/Composer.tsx` | content | U-004,U-008,U-009,U-011,U-017,U-023,U-030,U-032,U-043,U-083 | L-01,L-23,L-24 |
| `src/features/sessions/ui/ModelPicker.tsx` | content | U-004,U-008,U-012,U-023,U-033 |  |
| `src/features/sessions/ui/SessionPane.tsx` | content | U-002,U-008,U-009,U-011,U-023,U-030,U-036 | L-20,L-23,L-26 |
| `src/features/settings/model/appearance.ts` | content | U-002,U-031 | L-09 |
| `src/features/settings/model/settings.test.ts` | content | U-001,U-003,U-007,U-012,U-023,U-028,U-030,U-057 | L-19 |
| `src/features/settings/ui/SettingsView.tsx` | content | U-002,U-003,U-004,U-007,U-010,U-012,U-013,U-023,U-030,U-031,U-092 | L-09,L-19 |
| `src/features/source-control/model/unifiedDiff.ts` | content | U-099 |  |
| `src/features/source-control/ui/GitChangesPanel.test.ts` | content | U-023,U-025 | L-19 |
| `src/features/source-control/ui/GitChangesPanel.tsx` | content | U-005,U-023,U-025,U-098 | L-19 |
| `src/features/source-control/ui/SourceControl.tsx` | content | U-098 |  |
| `src/features/source-control/ui/SwitchBranchDialog.test.ts` | add/add | U-025 | L-19 |
| `src/features/source-control/ui/SwitchBranchDialog.tsx` | content | U-007,U-025 | L-19 |
| `src/features/source-control/ui/WorkingTreeDiff.tsx` | content | U-098,U-099 |  |
| `src/features/workspace/model/layout.ts` | content | U-005,U-023,U-098 |  |
| `src/features/workspace/model/workspaceSnapshot.test.ts` | content | U-023,U-038,U-044 |  |
| `src/features/workspace/model/workspaceSnapshot.ts` | content | U-005,U-023,U-038,U-044 |  |
| `src/features/workspace/ui/PaneTree.tsx` | content | U-005,U-008,U-011 | L-20,L-23 |
| `src/integrations/harness/core/apply.ts` | content | U-006,U-009,U-011,U-020,U-022,U-023,U-036,U-037,U-050,U-083,U-089,U-093 | L-20,L-23,L-24,L-25 |
| `src/integrations/harness/core/availability.ts` | content | U-004 | L-18 |
| `src/integrations/harness/core/child.ts` | content | U-013,U-023,U-029 |  |
| `src/integrations/harness/core/registry.test.ts` | content | U-008,U-093 | L-20 |
| `src/integrations/harness/core/registry.ts` | content | U-008,U-009,U-025,U-029,U-093 | L-19,L-20,L-23,L-24 |
| `src/integrations/harness/index.ts` | content | U-008,U-083 | L-19,L-20,L-23,L-25 |
| `src/integrations/harness/providers/antigravity/antigravity.ts` | modify/delete | U-013 |  |
| `src/integrations/harness/providers/antigravity/antigravityCatalog.ts` | modify/delete | U-013,U-023 |  |
| `src/integrations/harness/providers/antigravity/antigravityLive.test.ts` | modify/delete | U-013,U-023 |  |
| `src/integrations/harness/providers/antigravity/antigravityProtocol.test.ts` | modify/delete | U-017 |  |
| `src/integrations/harness/providers/claude/claude.ts` | content | U-011,U-013,U-034,U-036,U-037,U-062,U-087,U-089,U-093 | L-03,L-20,L-21,L-22,L-24,L-25,L-28 |
| `src/integrations/harness/providers/claude/claudeAdapter.ts` | content | U-008,U-093 | L-19,L-24 |
| `src/integrations/harness/providers/claude/claudeCatalog.ts` | content | U-013,U-023,U-069 |  |
| `src/integrations/harness/providers/claude/claudeLive.test.ts` | content | U-009,U-034,U-036,U-037,U-062,U-087,U-089,U-093 | L-20,L-21,L-22,L-24,L-25 |
| `src/integrations/harness/providers/claude/claudeProtocol.test.ts` | content | U-008,U-011,U-036,U-069,U-093 | L-03,L-19,L-20,L-22,L-24,L-25,L-28 |
| `src/integrations/harness/providers/claude/claudeText.ts` | content | U-008,U-013,U-025 | L-19 |
| `src/integrations/harness/providers/codex/codex.ts` | content | U-009,U-011,U-013,U-020,U-035,U-040 | L-20,L-21,L-23,L-25 |
| `src/integrations/harness/providers/codex/codexAdapter.ts` | content | U-008 | L-19,L-23 |
| `src/integrations/harness/providers/codex/codexCatalog.ts` | content | U-013,U-023 |  |
| `src/integrations/harness/providers/codex/codexElicitation.test.ts` | content | U-040 | L-20,L-23 |
| `src/integrations/harness/providers/codex/codexLive.test.ts` | content | U-009,U-020,U-035,U-037,U-040 | L-20,L-21,L-23,L-24,L-25 |
| `src/integrations/harness/providers/codex/codexProtocol.ts` | content | U-009,U-011,U-017,U-020,U-089,U-101 | L-19,L-20,L-24,L-25 |
| `src/integrations/harness/providers/codex/codexText.ts` | content | U-008,U-013,U-025 | L-19 |
| `src/integrations/harness/providers/opencode/opencodeAdapter.ts` | content | U-008 | L-19 |
| `src/integrations/harness/providers/opencode/opencodeText.test.ts` | add/add | U-008 | L-19 |
| `src/integrations/harness/providers/opencode/opencodeText.ts` | content | U-008,U-013,U-025 | L-19 |
| `src/platform/tauri/fs.test.ts` | content | U-016 | L-09 |
| `src/platform/tauri/pty.test.ts` | content | U-061 |  |
| `src/platform/tauri/pty.ts` | content | U-061 |  |
| `src/styles/index.css` | content | U-001,U-002,U-008,U-009,U-022,U-031,U-032,U-043,U-052,U-086,U-090 |  |

## Full B list

Textual clean merges remain subject to stage 4 behavior review.

| Path | U IDs | L IDs |
|---|---|---|
| `src-tauri/Cargo.toml` | U-007,U-017,U-019,U-030,U-064,U-075,U-076 | L-03,L-13,L-14 |
| `src-tauri/capabilities/default.json` | U-007 | L-17 |
| `src-tauri/src/control.rs` | U-009,U-030 |  |
| `src-tauri/src/pty.rs` | U-095 | L-14 |
| `src/app/model/appLifecycle.test.ts` | U-038,U-083 |  |
| `src/app/shell/SettingsRail.tsx` | U-023,U-030 |  |
| `src/app/shell/SidebarRename.test.ts` | U-001,U-026,U-044,U-073 | L-09 |
| `src/app/shell/TitleBar.tsx` | U-005,U-015,U-091 |  |
| `src/features/files/editor/editorDoc.ts` | U-056 | L-27 |
| `src/features/files/editor/editorGit.ts` | U-099 |  |
| `src/features/files/ui/FilePaneNavigation.test.ts` | U-023,U-030,U-056,U-083 |  |
| `src/features/files/ui/FileTree.tsx` | U-005,U-021,U-023,U-055 |  |
| `src/features/inbox/model/githubTasks.ts` | U-054 |  |
| `src/features/notes/notes.ts` | U-009 |  |
| `src/features/projects/ui/SearchableProjectPicker.tsx` | U-001,U-071 | L-09 |
| `src/features/providers/model/rateLimits.ts` | U-010,U-011 | L-12 |
| `src/features/sessions/model/attachments.ts` | U-017 |  |
| `src/features/sessions/model/models.ts` | U-004,U-044,U-069,U-070 |  |
| `src/features/sessions/model/secondOpinion.ts` | U-006 |  |
| `src/features/sessions/model/transcriptActivity.ts` | U-009,U-036,U-039,U-089 | L-25 |
| `src/features/sessions/ui/AccessPicker.tsx` | U-043 |  |
| `src/features/sessions/ui/AttachmentChip.tsx` | U-017 |  |
| `src/features/sessions/ui/ModelPicker.test.ts` | U-033 |  |
| `src/features/sessions/ui/SecondOpinionButton.tsx` | U-059,U-060 |  |
| `src/features/settings/model/appearance.test.ts` | U-002 | L-09 |
| `src/features/settings/model/newThreadBackgroundEffects.test.ts` | U-002 | L-09 |
| `src/features/settings/model/settings.ts` | U-001,U-003,U-007,U-010,U-012,U-013,U-023,U-028,U-030 | L-09,L-19 |
| `src/features/settings/ui/SettingsView.test.ts` | U-001,U-002,U-004,U-010,U-012,U-013,U-023,U-027,U-092 | L-19 |
| `src/features/skills/model/skills.ts` | U-023,U-032 | L-17 |
| `src/features/skills/ui/SkillPicker.tsx` | U-023 |  |
| `src/features/terminal/ui/TerminalView.tsx` | U-051,U-065 | L-08 |
| `src/features/workspace/model/layout.test.ts` | U-005,U-023,U-098 |  |
| `src/features/workspace/ui/SurfaceTabs.tsx` | U-005,U-023,U-098 |  |
| `src/integrations/harness/core/apply.test.ts` | U-011,U-020,U-036,U-037,U-050,U-062,U-089,U-093 | L-20,L-23,L-24 |
| `src/integrations/harness/core/types.ts` | U-009,U-011,U-020,U-036,U-089,U-093 | L-03,L-20,L-23,L-24,L-25,L-28 |
| `src/integrations/harness/providers/claude/claudeGit.ts` | U-025 | L-19 |
| `src/integrations/harness/providers/claude/claudeProtocol.ts` | U-011,U-017,U-036,U-093 | L-03,L-19,L-20,L-22,L-24,L-25,L-28 |
| `src/integrations/harness/providers/codex/codexElicitation.ts` | U-040 | L-20,L-23 |
| `src/integrations/harness/providers/codex/codexGit.ts` | U-025 | L-19 |
| `src/integrations/harness/providers/codex/codexProtocol.test.ts` | U-011,U-020,U-089,U-101 | L-19,L-20,L-25 |
| `src/integrations/harness/providers/opencode/opencode.ts` | U-013,U-089 | L-25 |
| `src/integrations/harness/providers/opencode/opencodeGit.ts` | U-025 | L-19 |
| `src/integrations/harness/providers/opencode/opencodeLive.test.ts` | U-089 | L-25 |
| `src/platform/tauri/fs.ts` | U-016,U-017,U-020,U-023,U-050 | L-09 |
| `src/platform/tauri/platform.ts` | U-031 |  |
| `src/shared/lib/paths.ts` | U-023,U-039 |  |
| `src/shared/ui/Popover.tsx` | U-007 | L-10 |

## S list and explanations

Verified: none. Actual modify/delete or rename conflicts live in X, which takes precedence over S.

## Local deletions, renames and moves

Verified from local `git diff --name-status -M 3344bea c2c8bf6`; no parked-tree inspection.

| Action | Old path | New path (if rename) |
|---|---|---|
| D | `docs/jira.md` | `—` |
| D | `docs/screenshot.jpg` | `—` |
| R072 | `src/integrations/harness/providers/antigravity/antigravityAdapter.ts` | `src/integrations/harness/core/antigravityAdapter.ts` |
| D | `src/integrations/harness/providers/antigravity/antigravity.ts` | `—` |
| D | `src/integrations/harness/providers/antigravity/antigravityCatalog.ts` | `—` |
| D | `src/integrations/harness/providers/antigravity/antigravityLive.test.ts` | `—` |
| D | `src/integrations/harness/providers/antigravity/antigravityProtocol.test.ts` | `—` |
| D | `src/integrations/harness/providers/antigravity/antigravityProtocol.ts` | `—` |
| D | `src/integrations/harness/providers/antigravity/antigravityReal.test.ts` | `—` |
| D | `src/integrations/harness/providers/antigravity/antigravitySoak.test.ts` | `—` |
