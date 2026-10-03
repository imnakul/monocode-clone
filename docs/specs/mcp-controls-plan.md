# Review — MCP controls and server approvals

Created: 2026-10-03 (IST). Tier: Large (provider protocols and configuration).
Branch: `nakul/windows-support-upstream-0.7.0`.
Base: `fa4118ba00ef4c5bbbf49c82ef2374d393f18675` (includes Nakul's latest 14 commits).

## Idea

Add a separate **Allow server for session** action to verified MCP tool approvals
in local Claude Code, Codex and OpenCode chats. Keep Allow once, single-tool
session approval and Deny. A server grant covers its other tools in that chat;
it is not permanent trust and cannot answer MCP forms or OAuth requests.

Add an Enable/Disable switch beside configured MCP rows in Settings, reusing
the existing Settings switch. Preserve commands, arguments, credentials and
unrelated settings. Existing local features and defaults remain the baseline.
Remote-machine sessions are explicitly outside this task.

## Research

- Existing Codex session approval is keyed by server **and tool**. Approving
  `socraticode/codebase_status` therefore still asks for `codebase_search`.
- Codex empty-form tool approval metadata is validated by `codexElicitation.ts`;
  retain that validation and Plan-mode/lifecycle guards for server grants.
- Claude supports session `addRules` updates and `mcp__<server>__*` allow rules.
  Disabled servers are a per-project `disabledMcpServers` list in `.claude.json`;
  project `.mcp.json` approval lists are a different feature.
- Codex uses `mcp_servers.<name>.enabled` in the selected TOML config.
- OpenCode v1 uses `mcp.<name>.enabled`; v2 uses
  `mcp.servers.<name>.disabled`. MCP permissions must match a verified server
  identity, not an arbitrary tool-name prefix.
- Claude Desktop and Cursor have distinct controls. Scope question was sent
  before implementation; proceed with the three discussed coding providers
  while waiting. Unsupported rows must never pretend a toggle is effective.
- Native desktop verification is a separate manual follow-up per AGENTS.md.
  Provider documentation was checked via Context7; runtime behavior needs the
  manual checks below. No local personal provider configuration is modified.

## Plan

1. Use this branch and spec as the checkpoint. One existing Luna 6 Max agent
   implements Claude/Codex approvals and shared UI/data work; the lead handles
   Rust config updates, OpenCode approvals and combined review. Neither creates
   another worktree.
2. Extend the approval scope/capability data through the local transcript,
   notifications, event reducer and persistence. Show the new action only
   when the provider identifies a valid MCP server. Keep other adapters and
   remote host behavior unchanged.
3. Store server grants only after successful approval replies. Isolate chats,
   servers, accounts and folders. Preserve cancellation, Plan mode and reset
   behavior; test process restart and other-tool/other-server boundaries.
4. Introduce `mcp_set_enabled(cwd, provider, scope, configPath, name, enabled)`.
   Validate a row against discovery before writing, and use native flags.
   Update only the selected definition (Claude's switch is per project).
   Preserve TOML/JSONC comments and unrelated config. Lock and atomically
   replace files; report errors without optimistic false success.
5. Extract the existing Settings Toggle into shared UI and reuse it. Identify
   busy/error state by full row identity. Refresh discovery after a successful
   change and explain that existing chats may need a new session/reload.
6. Run focused behavior tests, strict TypeScript, full web suite, Rust
   fmt/check/Clippy/tests and build. Update changelog and LOCAL-FEATURES.
7. Hand over a reviewed patch plus manual checklist. No installer or native
   desktop automation. Commit/push only within existing user authorization;
   do not merge into `nakul/windows-support`.

### Main files

- `src/integrations/harness/core/{types,apply,registry}.ts`
- `src/integrations/harness/providers/{claude,codex,opencode}/` approvals
- `src/features/sessions/{ui,model,data}/` approval controls and persistence
- `src/features/notifications/model/approvalToast.ts`
- `src/features/settings/{ui,model}/` MCP settings/cache
- `src/shared/ui/Toggle.tsx` (extracted existing component)
- `src-tauri/src/{mcp,lib}.rs`, configuration-edit helpers and tests
- Dependency manifests/lockfile only if a format-preserving parser is needed
- This spec, specs index, Current changelog, LOCAL-FEATURES

## Todos

- [x] Fetch and fast-forward to Nakul's latest branch; read current instructions.
- [x] Identify existing approval behavior and native provider controls.
- [x] Write spec and index before code.
- [x] Implement scoped server approvals and regression tests.
- [x] Implement safe native config switches and preservation tests.
- [x] Implement settings switches using the existing component.
- [x] Lead review: lifecycle, verified identity, config preservation, local features.
- [x] Focused tests and TypeScript.
- [x] Full `npm run check` (web and equivalent Rust gates), production build.
- [x] Update feature register/changelog; record results and remaining checks.
- [ ] Manual desktop/provider verification (Nakul / separate desktop session).

## Issues and fixes

- Existing unrelated untracked upstream-sync spec links are hands-off.
- No merge conflicts occurred when fast-forwarding to the user baseline.
- If source conflicts or behavior choices threaten existing features, stop and
  explain the choice before changing it.
- Before large checks: `/workspace` has about 20 GiB free; `/tmp` about 4.9 GiB.
- Backend focused checks: 34 MCP tests initially passed; adding a Windows
  newline test exposed toml_edit normalizing CRLF. Fixed existing flag updates
  to use parser spans and preserved CRLF when inserting a missing flag.
- Rust `cargo check` passed. Final Rust gates passed: formatting, Clippy with
  warnings denied, 596 tests and two existing ignored tests. Read-only config
  and Claude opt-in preservation regressions are included in the final run.
- OpenCode's tool IDs sanitize and concatenate server/tool names. Native
  `GET /mcp` supplies the complete registered server-name set. Server approval
  must reject colliding/overlapping names and revalidate each permission's
  callID-linked tool before replaying a grant. Ambiguous identities keep the
  ordinary approval flow; no guessed server-wide grants.
- Provider scope: proceed with the three coding providers discussed; the
  optional Desktop/Cursor question has not changed that scope so far.
- OpenCode implementation complete: 87 focused protocol/live tests passed,
  including 25 new cases; strict TypeScript passed. Cache grants only after a
  successful ordinary native reply, and refresh the native MCP name map for
  every replay. Restart keeps chat grants; forget/account/folder changes clear
  them. Failed replies, stop during write and Plan turns do not grant access.
- Combined TypeScript feature tests: 503 tests passed across 12 files.
- Final web check: 5,263 tests / 479 files passed; strict TypeScript passed.
  Production web build and host build passed; host tests: 96 passed, 5 skipped.
- Final review clarified Claude's native lists using its official MCP docs:
  configured servers consult only `disabledMcpServers`; `enabledMcpServers`
  controls default-off built-ins, and MCP-json lists control approval. The
  switch now preserves both unrelated lists. Final Rust rerun passed.
- Review caught a prospective Codex command/file approval regression; restored
  the existing session scope and added a file-change regression test before
  the final suite. Native conversation replacement now clears server grants.

## Learnings

An MCP connection being enabled is separate from permission to use its tools.
The Settings switch controls loading; a chat approval controls authorization.

## Done

Implementation is complete; status **Review** until manual desktop/provider
checks below are completed. Source and docs are on the requested branch, on top
of `fa4118b`; the Task Manager/composer stack and defaults were preserved.

Implementation commit: `647cf0919e77cbbb30c714aa0797525a79ef90ae`.

Verified on Linux in the managed workspace:
- `npm run check:web`: 479 files, 5,263 tests; TypeScript clean.
- `npm run check:rust`: fmt and Clippy clean, 596 tests passed / 2 ignored.
- `cargo check -p monocode --locked`: passed.
- `npm run build`: passed; existing generated CSS / chunk-size warnings remain.
- `npm run host:build`: passed; `npm run test:host`: 96 passed / 5 skipped.
- Focused TypeScript feature suite: 503 tests; OpenCode focused suite: 87 tests.
- `git diff --check`: clean. No installer or native desktop automation run.

Scope: configured Claude Code/Codex/OpenCode switches and verified local MCP
tool approvals. Claude Desktop/Cursor and health-only entries show why their
switch is unavailable. OpenCode ambiguous/CodeMode permissions without a direct
qualified MCP call, and unknown Claude server identities, keep ordinary
approval. Grants survive provider process restarts within this app session;
they are not saved as permanent server trust or restored after an app restart.

Resume: run the manual follow-up below in `npm run tauri dev`, record provider
versions and actual behavior, then mark this spec Done and archive it per the
index convention. If anything fails, record the case here before changing code.

### Manual follow-up (not an implementation-agent task)

1. In each provider, enable/disable a configured MCP, refresh Settings and
   start a new chat. Confirm the provider actually loads/skips that server.
2. With normal approval mode, allow one SocratiCode tool for the server's
   session, then invoke a different tool from that server: no repeated prompt.
3. A different server/new chat still asks. Single-tool approval still asks
   for a different tool. Plan mode keeps its existing restrictions.
4. MCP forms, sign-in/OAuth and generic approvals keep their existing flow.
5. Check duplicate-name rows, error messages, switch keyboard access and both
   transcript and toast buttons in the native desktop app.
