# Worktree cleanup — 24 September 2026

This is a local-only record. `docs/` is ignored by Git. The user directed this
cleanup; no code from the deleted worktrees was merged into
`nakul/windows-support` as part of it. The usual worktree closeout sequence in
`WORKING-AGREEMENT.md` was superseded by that explicit instruction.

## Upstream sync — intentionally not merged

- Worktree: `E:\Developing\OpenSource\mono-clone-upstream-sync`
- Local branch: `sync/upstream-main-2026-09-12`
- Branch HEAD before deletion: `7095e9f` (an ancestor of the current
  `nakul/windows-support`; 217 commits behind it on 24 September)
- Decision: **intentionally did not merge or copy the staged changes**.
  Deleted the worktree and its local branch on **24 September 2026**. The
  `personal/sync/upstream-main-2026-09-12` remote-tracking ref was not changed;
  it points to the old committed branch tip and does **not** contain the staged
  work described below.

Four files held staged, uncommitted changes in the old source layout:
`src/chrome/Sidebar.tsx`, `src/chrome/Sidebar.test.ts`,
`src/lib/sessionFolders.ts`, and `src/lib/sessionFolders.test.ts`.
`src-tauri/Cargo.toml` showed a line-ending-only working-tree status, with no
content diff.

The staged work addressed two potential data-loss cases:

1. **Partial session lists:** The Sidebar stopped automatically pruning saved
   folder memberships when its current session list was empty or incomplete.
   Missing sessions would be filtered while rendering; persisted membership
   would change only through an explicit folder operation. Its test mounted
   the Sidebar with empty, partial, and complete lists and checked that saved
   folders stayed intact.
2. **Windows path aliases:** Session-folder storage treated slash direction and
   drive-letter case variants of one project path as the same project. It
   merged duplicate folder lists without dropping unique folders or session
   IDs, preferred canonical metadata where possible, wrote one canonical key
   on save, and handled pinned/reminder collapsed state across aliases. Tests
   covered aliases, invalid records, unrelated-project isolation, explicit
   folder operations, and the ChatPanel pseudo-key.

The current `nakul/windows-support` source still has Sidebar's automatic
`pruneSessionFolders` effect and does not have the staged `mergeFolderLists`
helper. Therefore this specific staged work was **not already present** in the
main checkout when the worktree was removed. It came from a much older source
layout and was not validated against current main. This record describes the
intent and acceptance cases; it is not a preserved code patch.

Removing this worktree increased measured free space on E: by 0.52 GB.

## Other worktrees removed on 24 September

Earlier the same day, the user directed removal of these eight registered
worktrees and their local branch references: `mono-clone-motion`,
`mono-clone-nav-motion`, `mono-clone-term`, `mono-clone-queue`,
`mono-clone-skills-pr`, `mono-clone-api-provider`, `mono-clone-capture`, and
`mono-clone-chat`. The empty, unregistered `mono-clone-migrate` directory was
also removed. Uncommitted edits in those worktrees were discarded as requested.
No remote branches were deleted and the main checkout was not changed by the
removals. Measured free-space increase from that earlier cleanup was 5.65 GB
on D: and 2.24 GB on E: (7.89 GB total).

## MCP and Tasks worktrees remembered from 8 September

The earlier `docs/notes/archive/worktree-cleanup-audit-2026-09-08.md` listed
`mono-clone-mcp`, `mono-clone-tasks`, and `mono-clone-scheduled` as registered
worktrees at that time. On 24 September, none was registered by
`git worktree list` or present as a top-level folder under
`E:\Developing\OpenSource`. Local branch refs `feature/mcp-hub`,
`feature/tasks-foundation`, and `feature/scheduled-tasks` still exist, and
their committed tips are ancestors of `nakul/windows-support`.

The 8 September audit also recorded **uncommitted** MCP and Tasks work. A
branch tip being in main does not establish what happened to those edits.
Their former directories are unavailable for a content comparison, so their
uncommitted work must not be described as integrated solely from branch
ancestry. No MCP or Tasks branch or remote ref was deleted in this cleanup.

## Worktrees left after cleanup

`git worktree list` shows only the integration checkout
`E:\Developing\OpenSource\mono-clone` and two feature worktrees:
`mono-clone-hari` and `mono-clone-remote`. The main checkout's existing
uncommitted changes were left untouched by this cleanup.
