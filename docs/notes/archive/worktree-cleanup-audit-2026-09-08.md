# Worktree cleanup audit - 8 September 2026

Read WORKING-AGREEMENT.md, docs/WINDOWS-CHANGES.md and docs/changelog/LOCAL-CHANGELOG.md before edits. Fetched personal (imnakul/monocode-clone); no push.

## MCP
Source fix in mono-clone-mcp: enabled connector checks moved from page opening to app startup with window-lifetime cache. Manual refresh remains. See that worktree's docs/mcp-startup-refresh-plan.md and docs/changelog/LOCAL-CHANGELOG.md for checks and known failures. Existing MCP work is still uncommitted; retain worktree.

## Queue
The screenshot's Follow-up behavior Queue/Steer setting originates in upstream commit 91c05cc, dated 2026-09-03, feat: add configurable queued follow-ups (#56). It came into the integration history with the September 5 upstream merge c2aa73f. All later feature branches share it (including MCP, queue, tasks, scheduled, API, chat and capture). This explains why the setting is present in builds from the integration line; no evidence of uncommitted queue code leaking between branches.

Extra work in mono-clone-queue is uncommitted: queue persistence including attachments/cards, paused restoration, holding after errors, and waiting for cancellation before fallback steering. The integration source does not contain beginQueuedSteerCancellation or queue restoration changes. Screenshot/manual basic queue behavior does not prove those extras are in the installed binary. No installed binary inspection was performed.

User confirmed manual queue behavior works. Read-only rerun: messageQueue.test.ts, queueDurability.test.ts, sessionStore.test.ts: 44/44 pass. Evidence: mono-clone-queue/docs/queue-cleanup-verification.log. Retain worktree until remaining work is integrated/backed up.

## Terminal - deletion condition NOT met
personal/feature/windows-terminal points to d76d3ef, matching local HEAD. The original terminal commit is backed up on GitHub.
However the worktree contains 41 changed/untracked entries, including newer output recovery in src-tauri/src/pty.rs, src/lib/pty.ts and src/surfaces/TerminalView.tsx, plus chat/session work and local notes. Terminal files differ from both personal/feature/windows-terminal and personal/nakul/windows-support. Do not force-remove: user's condition was that everything is already on GitHub. No deletion performed.

## Inventory
12 registered worktrees, including main. Changed/untracked counts at audit:
- main: 26
- antigravity b79b: 0
- motion (D drive): 18
- nav-motion (D drive): 4
- API provider: 0
- capture: 1
- chat: 0
- MCP: 20 after this fix
- queue: 13
- scheduled: 2
- tasks: 29
- terminal: 41

A clean tracked status alone does not establish safe removal: ignored notes, installers and any unique commits must also be preserved. Remaining worktrees were inventoried only; no cleanup of their source, dependencies, build outputs or local documents was performed. No worktree was removed during this task.
