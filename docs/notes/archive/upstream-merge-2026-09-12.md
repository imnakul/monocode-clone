# Upstream Main Synchronization Plan: 2026-09-12

## Worktree Parameters
- Target Branch: nakul/windows-support
- Target HEAD: 06e36683325d954f9a8f3cf2f7fd1bda568567da
- Merge Base: cb6e2df2b82ead29471022c1824d9f0df4b415cd (2026-09-05 upstream tip)
- Upstream Tip: 36d6d28f50ec8ba1d7e12729e1f9a54cf383751f (Release 0.1.44)
- Ahead / Behind: 68 commits unique to ours / 102 commits unique to upstream origin/main
- Isolated Sync Worktree: E:\Developing\OpenSource\mono-clone-upstream-sync
- Isolated Sync Branch: sync/upstream-main-2026-09-12

## Inventory Summary
- Total files modified by upstream: 289
- Total files modified by ours: 194
- Total overlapping files: 93
- Cleanly merged files by Git: 33
- Explicit merge conflicts: 60 (57 content/content [UU], 3 add/add [AA])

## Explicit Conflicts List (60 files)
1. Cargo.lock (UU)
2. Cargo.toml (UU)
3. package-lock.json (UU)
4. package.json (UU)
5. src-tauri/build.rs (UU)
6. src-tauri/capabilities/default.json (UU)
7. src-tauri/src/fs.rs (UU)
8. src-tauri/src/harness.rs (UU)
9. src-tauri/src/lib.rs (UU)
10. src-tauri/src/pty.rs (UU)
11. src-tauri/src/session_store.rs (UU)
12. src-tauri/src/window.rs (UU)
13. src-tauri/tauri.conf.json (UU)
14. src-tauri/tauri.windows.conf.json (AA)
15. src/App.tsx (UU)
16. src/chrome/AttachmentChip.tsx (UU)
17. src/chrome/Composer.tsx (UU)
18. src/chrome/ExplorerMenu.tsx (UU)
19. src/chrome/GitChangesPanel.tsx (UU)
20. src/chrome/HarnessIcon.tsx (UU)
21. src/chrome/InboxFiltersMenu.tsx (UU)
22. src/chrome/ModelPicker.tsx (UU)
23. src/chrome/SessionReview.tsx (UU)
24. src/chrome/SettingsRail.tsx (UU)
25. src/chrome/Sidebar.tsx (UU)
26. src/chrome/SkillPicker.tsx (UU)
27. src/chrome/SourceControl.tsx (UU)
28. src/chrome/SurfaceTabs.test.ts (UU)
29. src/chrome/SurfaceTabs.tsx (UU)
30. src/chrome/TitleBar.tsx (UU)
31. src/index.css (UU)
32. src/lib/appearance.test.ts (UU)
33. src/lib/appearance.ts (UU)
34. src/lib/fs.test.ts (UU)
35. src/lib/fs.ts (UU)
36. src/lib/harness/apply.test.ts (UU)
37. src/lib/harness/codexProtocol.ts (UU)
38. src/lib/inboxFilters.test.ts (UU)
39. src/lib/inboxFilters.ts (UU)
40. src/lib/layout.ts (UU)
41. src/lib/paths.ts (UU)
42. src/lib/platform.ts (UU)
43. src/lib/session.ts (UU)
44. src/lib/sessionHistory.ts (UU)
45. src/lib/sessionStore.ts (UU)
46. src/lib/sessionTitle.test.ts (AA)
47. src/lib/settings.ts (UU)
48. src/lib/skills.ts (UU)
49. src/lib/workspaceSnapshot.ts (UU)
50. src/surfaces/AgentTranscript.tsx (UU)
51. src/surfaces/EmptySession.tsx (UU)
52. src/surfaces/FileEditor.tsx (UU)
53. src/surfaces/FilePane.tsx (UU)
54. src/surfaces/InboxView.test.ts (AA)
55. src/surfaces/InboxView.tsx (UU)
56. src/surfaces/NotesView.tsx (UU)
57. src/surfaces/SessionPane.tsx (UU)
58. src/surfaces/SettingsView.tsx (UU)
59. src/surfaces/TerminalView.tsx (UU)
60. src/surfaces/WorkingTreeDiff.tsx (UU)

## Strategic Resolution Decisions Needed
1. SQLite Schema Migration Resequencing:
   - Upstream added migration 12 (linked_work_item_json TEXT + index rebuild) and migration 13 (crate::notes::ensure_notes_table).
   - Local5 added migration 12 (queued_messages_json TEXT, queue_status TEXT).
   - Recommendation: Resequence Local5 queue durability migration to Migration 14 so both upstream migrations apply cleanly without collisions.
